import AppIntents
import CoreLocation
internal import ExpoModulesCore
import JavaScriptCore
import SQLite3
import UserNotifications

// The part of Swept that must work while the app is closed: the two Shortcuts
// actions fired by the car's Bluetooth automation.
//
//   "Je suis garé" → GPS fix → nearby block sides from sides.db → the shared
//   @swept/core logic (SweptCoreBundle, run in JavaScriptCore) picks the side and
//   plans the notifications → they are scheduled here.
//   "Je pars"      → cancel the reminders, mark the spot as left. Optional: the next
//   "Je suis garé" replaces or clears the previous spot anyway.
//
// The JS app picks up what happened through `takeNativeState()` on its next launch.

class ParkingModule: Module {
  public func definition() -> ModuleDefinition {
    // JSON: { lang, settings } — what the intents need from the app (dbPath is ignored: see SidesDB.path).
    Function("setConfig") { (json: String) in Shared.defaults.set(json, forKey: Shared.configKey) }
    // What the intents did since the last call: { spot?: json, leftAt?: ms, lastAutoAt?: ms }.
    Function("takeNativeState") { () -> [String: Any] in Shared.takeState() }
    Function("events") { ParkLog.all() }
    Function("clearEvents") { ParkLog.clear() }
    // Same code paths as the Shortcuts actions, for the in-app test and the simulator.
    AsyncFunction("simulatePark") { () async -> Void in await Parker.park(source: "app") }
    AsyncFunction("simulateLeave") { () async -> Void in await Parker.leave(source: "app") }
  }
}

// MARK: - Shortcuts actions

struct ParkedIntent: AppIntent {
  static let title: LocalizedStringResource = "Je suis garé"
  static let description = IntentDescription("Note où la voiture est garée et programme les rappels de nettoyage.")
  static let openAppWhenRun = false

  func perform() async throws -> some IntentResult {
    await Parker.park(source: "shortcut")
    return .result()
  }
}

struct LeavingIntent: AppIntent {
  static let title: LocalizedStringResource = "Je pars"
  static let description = IntentDescription("Efface l'emplacement et annule les rappels.")
  static let openAppWhenRun = false

  func perform() async throws -> some IntentResult {
    await Parker.leave(source: "shortcut")
    return .result()
  }
}

struct SweptShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ParkedIntent(),
      phrases: ["Je suis garé avec \(.applicationName)", "I parked with \(.applicationName)"],
      shortTitle: "Je suis garé",
      systemImageName: "parkingsign"
    )
    AppShortcut(
      intent: LeavingIntent(),
      phrases: ["Je pars avec \(.applicationName)", "I'm leaving with \(.applicationName)"],
      shortTitle: "Je pars",
      systemImageName: "car"
    )
  }
}

// MARK: - State shared with the JS app

enum Shared {
  static let defaults = UserDefaults.standard
  static let configKey = "swept.config"
  static let spotKey = "swept.native.spot"
  static let leftKey = "swept.native.leftAt"
  static let autoKey = "swept.native.lastAutoAt"

  static var config: [String: Any]? {
    guard let json = defaults.string(forKey: configKey), let data = json.data(using: .utf8) else { return nil }
    return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
  }

  static func takeState() -> [String: Any] {
    var state: [String: Any] = [:]
    if let spot = defaults.string(forKey: spotKey) { state["spot"] = spot }
    if defaults.object(forKey: leftKey) != nil { state["leftAt"] = defaults.double(forKey: leftKey) }
    if defaults.object(forKey: autoKey) != nil { state["lastAutoAt"] = defaults.double(forKey: autoKey) }
    defaults.removeObject(forKey: spotKey)
    defaults.removeObject(forKey: leftKey)
    return state
  }
}

// MARK: - Park / leave flows

enum Parker {
  static func park(source: String) async {
    let started = Date()
    let nowMs = started.timeIntervalSince1970 * 1000
    do {
      guard let config = Shared.config else { throw ParkError.notSetUp }
      let fix = try await OneShotLocation().fetch()
      let near = try SidesDB.near(path: SidesDB.path(), lat: fix.latitude, lng: fix.longitude)

      let input: [String: Any] = [
        "lat": fix.latitude,
        "lng": fix.longitude,
        "accuracy": fix.accuracy,
        "now": nowMs,
        "lang": config["lang"] as? String ?? "fr",
        "settings": config["settings"] as? [String: Any] ?? [:],
        "source": source == "shortcut" ? "auto" : "manual",
        "rows": near.rows,
        "ruleJson": near.ruleJson,
      ]
      let result = try Core.parked(input)

      var event: [String: Any] = [
        "at": nowMs, "source": source, "kind": "park",
        "lat": fix.latitude, "lng": fix.longitude,
        "accuracy": fix.accuracy, "seconds": Date().timeIntervalSince(started),
        "fixes": fix.count, "stale": fix.stale,
      ]
      if source == "shortcut" { Shared.defaults.set(nowMs, forKey: Shared.autoKey) }

      guard let spot = result["spot"] as? [String: Any] else {
        // Not on a street (garage, driveway). The car has still moved, so the previous
        // spot and its reminders are over; a stale position proves nothing, so keep them.
        event["note"] = "not on a street"
        ParkLog.append(event)
        if !fix.stale {
          await Notifier.cancelAll()
          Shared.defaults.removeObject(forKey: Shared.spotKey)
          Shared.defaults.set(nowMs, forKey: Shared.leftKey)
        }
        return
      }
      event["street"] = spot["street"]
      event["side"] = spot["side"]
      ParkLog.append(event)

      let spotJson = String(data: try JSONSerialization.data(withJSONObject: spot), encoding: .utf8)
      Shared.defaults.set(spotJson, forKey: Shared.spotKey)
      Shared.defaults.removeObject(forKey: Shared.leftKey)

      await Notifier.cancelAll()
      for n in result["notifications"] as? [[String: Any]] ?? [] { await Notifier.schedule(n) }
    } catch {
      ParkLog.append(["at": nowMs, "source": source, "kind": "park", "error": "\(error)"])
    }
  }

  static func leave(source: String) async {
    let nowMs = Date().timeIntervalSince1970 * 1000
    await Notifier.cancelAll()
    Shared.defaults.removeObject(forKey: Shared.spotKey)
    Shared.defaults.set(nowMs, forKey: Shared.leftKey)
    if source == "shortcut" { Shared.defaults.set(nowMs, forKey: Shared.autoKey) }
    ParkLog.append(["at": nowMs, "source": source, "kind": "leave"])
  }
}

enum ParkError: Error, CustomStringConvertible {
  case notSetUp
  case database(String)
  case core(String)

  var description: String {
    switch self {
    case .notSetUp: return "open Swept once so it can prepare its data"
    case .database(let m): return "database: \(m)"
    case .core(let m): return "core: \(m)"
    }
  }
}

// MARK: - Shared logic (JavaScriptCore)

enum Core {
  static func parked(_ input: [String: Any]) throws -> [String: Any] {
    guard let context = JSContext() else { throw ParkError.core("no JS context") }
    var failure: String?
    context.exceptionHandler = { _, error in failure = error?.toString() }
    context.evaluateScript(SweptCoreBundle.source)

    let inputJson = String(data: try JSONSerialization.data(withJSONObject: input), encoding: .utf8) ?? "{}"
    let output = context.objectForKeyedSubscript("SweptCore")?.invokeMethod("parked", withArguments: [inputJson])
    if let failure { throw ParkError.core(failure) }
    guard let json = output?.toString(), let data = json.data(using: .utf8),
          let result = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { throw ParkError.core("unreadable result") }
    return result
  }
}

// MARK: - sides.db

enum SidesDB {
  /// Where expo-sqlite keeps the database. Derived on every run: iOS moves the app's
  /// container on each reinstall, so an absolute path saved earlier goes stale.
  static func path() throws -> String {
    let documents = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
    let file = documents.appendingPathComponent("SQLite/sides.db")
    guard FileManager.default.fileExists(atPath: file.path) else { throw ParkError.notSetUp }
    return file.path
  }

  /// Block sides whose bounding box is within ~130 m of the point, plus the rules they reference.
  static func near(path: String, lat: Double, lng: Double) throws -> (rows: [[String: Any]], ruleJson: [String: String]) {
    var db: OpaquePointer?
    guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK, let db else {
      throw ParkError.database("cannot open \(path)")
    }
    defer { sqlite3_close(db) }

    let dLat = 0.0012, dLng = 0.0017
    var rows: [[String: Any]] = []
    try query(db, """
      SELECT id, seg, street, grid, a1, a2, oneway, line, rules FROM side
      WHERE maxlat >= ? AND minlat <= ? AND maxlng >= ? AND minlng <= ?
      """, [lat - dLat, lat + dLat, lng - dLng, lng + dLng]) { s in
      var row: [String: Any] = [
        "id": sqlite3_column_int64(s, 0), "seg": sqlite3_column_int64(s, 1),
        "street": text(s, 2), "grid": text(s, 3),
        "a1": sqlite3_column_int64(s, 4), "a2": sqlite3_column_int64(s, 5),
        "oneway": sqlite3_column_int64(s, 6), "line": text(s, 7),
      ]
      row["rules"] = sqlite3_column_type(s, 8) == SQLITE_NULL ? NSNull() : text(s, 8)
      rows.append(row)
    }

    let ids = Set(rows.compactMap { $0["rules"] as? String }
      .flatMap { $0.split(separator: ",") }
      .compactMap { Int($0.split(separator: ":").first ?? "") })
    var ruleJson: [String: String] = [:]
    if !ids.isEmpty {
      try query(db, "SELECT id, json FROM rule WHERE id IN (\(ids.map(String.init).joined(separator: ",")))", []) { s in
        ruleJson[String(sqlite3_column_int64(s, 0))] = text(s, 1)
      }
    }
    return (rows, ruleJson)
  }

  private static func text(_ s: OpaquePointer?, _ column: Int32) -> String {
    sqlite3_column_text(s, column).map { String(cString: $0) } ?? ""
  }

  private static func query(_ db: OpaquePointer, _ sql: String, _ args: [Double], row: (OpaquePointer?) -> Void) throws {
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
      throw ParkError.database(String(cString: sqlite3_errmsg(db)))
    }
    defer { sqlite3_finalize(statement) }
    for (i, value) in args.enumerated() { sqlite3_bind_double(statement, Int32(i + 1), value) }
    while sqlite3_step(statement) == SQLITE_ROW { row(statement) }
  }
}

// MARK: - Notifications

enum Notifier {
  static let prefix = "swept."

  /// Remove every Swept reminder, pending or already shown.
  static func cancelAll() async {
    let center = UNUserNotificationCenter.current()
    let pending = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(prefix) }
    center.removePendingNotificationRequests(withIdentifiers: pending)
    let delivered = await center.deliveredNotifications().map(\.request.identifier).filter { $0.hasPrefix(prefix) }
    center.removeDeliveredNotifications(withIdentifiers: delivered)
  }

  /// Schedule one `PlannedNotification` from @swept/core.
  static func schedule(_ n: [String: Any]) async {
    guard let id = n["id"] as? String else { return }
    let content = UNMutableNotificationContent()
    content.title = n["title"] as? String ?? ""
    content.body = n["body"] as? String ?? ""
    content.categoryIdentifier = n["category"] as? String ?? ""
    if n["sound"] as? Bool ?? true { content.sound = .default }
    if n["timeSensitive"] as? Bool == true { content.interruptionLevel = .timeSensitive }
    // expo-notifications reads the payload from `userInfo.body`.
    content.userInfo = ["body": n["data"] as? [String: Any] ?? [:]]

    var trigger: UNNotificationTrigger?
    if let at = n["at"] as? Double {
      let seconds = at / 1000 - Date().timeIntervalSince1970
      guard seconds > 1 else { return }
      trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
    }
    try? await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
  }
}

// MARK: - One-shot GPS fix

enum LocationError: Error, CustomStringConvertible {
  case notAuthorized(CLAuthorizationStatus)
  case noFix

  var description: String {
    switch self {
    case .notAuthorized(let s): return "location not authorized (status \(s.rawValue))"
    case .noFix: return "no GPS fix before timeout"
    }
  }
}

struct Fix {
  let latitude: Double
  let longitude: Double
  let accuracy: Double
  /// Fresh fixes collected.
  let count: Int
  /// No fresh fix arrived: this is iOS's cached position with its accuracy degraded.
  let stale: Bool
}

/// A position measured now.
///
/// When updates start, Core Location first replays its *cached* position: often
/// minutes old and from somewhere else, yet reported as "±8 m". Taking it was the
/// bug that pinned every parking on avenue Coloniale to the same point. So fixes
/// older than the request are ignored, and GPS gets a few seconds to settle
/// before the most accurate fresh fix is taken.
@MainActor
final class OneShotLocation: NSObject, CLLocationManagerDelegate {
  private static let settle: TimeInterval = 6
  private static let timeout: TimeInterval = 18
  private static let goodEnough: CLLocationAccuracy = 8

  private let manager = CLLocationManager()
  private var continuation: CheckedContinuation<Fix, Error>?
  private var started = Date()
  private var fresh: [CLLocation] = []
  private var cached: CLLocation?

  func fetch() async throws -> Fix {
    let status = manager.authorizationStatus
    guard status == .authorizedAlways || status == .authorizedWhenInUse else {
      throw LocationError.notAuthorized(status)
    }
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.distanceFilter = kCLDistanceFilterNone
    if status == .authorizedAlways { manager.allowsBackgroundLocationUpdates = true }

    return try await withCheckedThrowingContinuation { cont in
      continuation = cont
      started = Date()
      manager.startUpdatingLocation()
      Task { @MainActor in
        // Don't rely on another fix arriving to notice the settle time is over.
        try? await Task.sleep(for: .seconds(Self.settle))
        self.finishIfGoodEnough()
        try? await Task.sleep(for: .seconds(Self.timeout - Self.settle))
        self.finish()
      }
    }
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    Task { @MainActor in
      for loc in locations where loc.horizontalAccuracy >= 0 {
        if loc.timestamp >= started.addingTimeInterval(-1) { fresh.append(loc) } else { cached = loc }
      }
      finishIfGoodEnough()
    }
  }

  private func finishIfGoodEnough() {
    guard Date().timeIntervalSince(started) >= Self.settle, let best = best(), best.horizontalAccuracy <= Self.goodEnough else { return }
    finish()
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    // kCLErrorLocationUnknown is transient; keep waiting for the timeout.
    if (error as? CLError)?.code == .locationUnknown { return }
    Task { @MainActor in self.finish() }
  }

  /// The most accurate fresh fix; GPS tightens over the first seconds, so later wins ties.
  private func best() -> CLLocation? {
    fresh.min { ($0.horizontalAccuracy, -$0.timestamp.timeIntervalSince1970) < ($1.horizontalAccuracy, -$1.timestamp.timeIntervalSince1970) }
  }

  private func finish() {
    manager.stopUpdatingLocation()
    guard let continuation else { return }
    self.continuation = nil
    if let best = best() {
      continuation.resume(returning: Fix(
        latitude: best.coordinate.latitude, longitude: best.coordinate.longitude,
        accuracy: best.horizontalAccuracy, count: fresh.count, stale: false))
    } else if let cached {
      // Better than recording nothing, but not to be trusted for the side: the
      // degraded accuracy makes the shared logic ask instead of guessing.
      continuation.resume(returning: Fix(
        latitude: cached.coordinate.latitude, longitude: cached.coordinate.longitude,
        accuracy: max(cached.horizontalAccuracy, 100), count: 0, stale: true))
    } else {
      continuation.resume(throwing: LocationError.noFix)
    }
  }
}

// MARK: - Event log (UserDefaults, last 30 runs) for the in-app test and diagnostics

enum ParkLog {
  private static let key = "swept.parkEvents"

  static func all() -> [[String: Any]] {
    UserDefaults.standard.array(forKey: key) as? [[String: Any]] ?? []
  }

  static func append(_ event: [String: Any]) {
    UserDefaults.standard.set(Array(([event] + all()).prefix(30)), forKey: key)
  }

  static func clear() {
    UserDefaults.standard.removeObject(forKey: key)
  }
}
