import AVFoundation
import AppKit
import Foundation

let srcPath = CommandLine.arguments[1]
let outDir = CommandLine.arguments[2]
let url = URL(fileURLWithPath: srcPath)
let asset = AVURLAsset(url: url)
let duration = CMTimeGetSeconds(asset.duration)
print("duration=\(duration)")

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 1400, height: 800)

// denser sampling through likely create/program sections
var times: [Double] = []
var t = 0.5
while t < duration {
    times.append(t)
    t += 4.0
}
times.append(max(0, duration - 0.3))

let nsTimes = times.map { NSValue(time: CMTimeMakeWithSeconds($0, preferredTimescale: 600)) }
let sem = DispatchSemaphore(value: 0)
var count = 0
generator.generateCGImagesAsynchronously(forTimes: nsTimes) { requested, cgImage, actual, result, error in
    defer {
        count += 1
        if count >= nsTimes.count { sem.signal() }
    }
    guard let cgImage = cgImage, result == .succeeded else { return }
    let sec = CMTimeGetSeconds(actual)
    let name = String(format: "frame_%05.1f.png", sec)
    let outURL = URL(fileURLWithPath: outDir).appendingPathComponent(name)
    let rep = NSBitmapImageRep(cgImage: cgImage)
    let data = rep.representation(using: .png, properties: [:])
    try? data?.write(to: outURL)
    print("wrote \(name)")
}
sem.wait()
