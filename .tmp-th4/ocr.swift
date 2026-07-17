import Vision
import AppKit
import Foundation

let dir = CommandLine.arguments[1]
let files = (try! FileManager.default.contentsOfDirectory(atPath: dir))
  .filter { $0.hasPrefix("frame_") && $0.hasSuffix(".png") }
  .sorted()

for name in files {
  let path = "\(dir)/\(name)"
  guard let img = NSImage(contentsOfFile: path),
        let tiff = img.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff),
        let cg = rep.cgImage else { continue }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  try? handler.perform([request])
  let observations = request.results ?? []
  let sorted = observations.sorted {
    let a = $0.boundingBox, b = $1.boundingBox
    if abs(a.maxY - b.maxY) > 0.02 { return a.maxY > b.maxY }
    return a.minX < b.minX
  }
  var lines: [String] = []
  var currentY: CGFloat? = nil
  var currentLine: [String] = []
  for obs in sorted {
    guard let t = obs.topCandidates(1).first?.string else { continue }
    let y = obs.boundingBox.maxY
    if let cy = currentY, abs(cy - y) > 0.015 {
      lines.append(currentLine.joined(separator: " "))
      currentLine = [t]
      currentY = y
    } else {
      currentLine.append(t)
      if currentY == nil { currentY = y }
    }
  }
  if !currentLine.isEmpty { lines.append(currentLine.joined(separator: " ")) }
  let preview = lines.filter { $0.count > 2 }.prefix(16).joined(separator: " || ")
  print("[\(name)] \(preview)")
}
