// On-device transcription with Apple's Speech framework.
// Usage: apple_stt <audio-file>  → prints JSON {transcript, confidence, segments:[{text,start,duration,confidence}]}
import Foundation
import Speech

func fail(_ msg: String, _ code: Int32 = 1) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(code)
}

guard CommandLine.arguments.count >= 2 else { fail("usage: apple_stt <audio-file>", 2) }
let url = URL(fileURLWithPath: CommandLine.arguments[1])

let authSem = DispatchSemaphore(value: 0)
var status: SFSpeechRecognizerAuthorizationStatus = .notDetermined
SFSpeechRecognizer.requestAuthorization { s in status = s; authSem.signal() }
authSem.wait()
guard status == .authorized else {
    fail("Speech recognition not authorized (status \(status.rawValue)). Enable it in System Settings → Privacy & Security → Speech Recognition.", 3)
}

guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")), recognizer.isAvailable else {
    fail("Apple speech recognizer unavailable.", 4)
}

let request = SFSpeechURLRecognitionRequest(url: url)
request.shouldReportPartialResults = false
request.addsPunctuation = true
if recognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }

let done = DispatchSemaphore(value: 0)
var output: [String: Any]? = nil
var errMsg: String? = nil

recognizer.recognitionTask(with: request) { result, error in
    if let error = error { errMsg = error.localizedDescription; done.signal(); return }
    guard let result = result, result.isFinal else { return }
    let segs = result.bestTranscription.segments.map { s -> [String: Any] in
        ["text": s.substring, "start": s.timestamp, "duration": s.duration, "confidence": Double(s.confidence)]
    }
    let confs = segs.compactMap { $0["confidence"] as? Double }
    output = [
        "transcript": result.bestTranscription.formattedString,
        "confidence": confs.isEmpty ? 0.0 : confs.reduce(0, +) / Double(confs.count),
        "on_device": request.requiresOnDeviceRecognition,
        "segments": segs,
    ]
    done.signal()
}

// Pump the run loop so callbacks are delivered; give up after 120s.
let deadline = Date().addingTimeInterval(120)
while done.wait(timeout: .now() + .milliseconds(50)) == .timedOut {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05))
    if Date() > deadline { fail("Apple transcription timed out.", 5) }
}
if let e = errMsg, output == nil {
    // "No speech detected" is reported as an error by the framework.
    print("{\"transcript\":\"\",\"confidence\":0,\"segments\":[],\"error\":\(String(reflecting: e).replacingOccurrences(of: "\\'", with: "'"))}")
    exit(0)
}
let data = try! JSONSerialization.data(withJSONObject: output ?? [:])
print(String(data: data, encoding: .utf8)!)
