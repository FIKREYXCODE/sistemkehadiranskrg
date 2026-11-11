import Foundation
import AppKit

let base = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath, isDirectory: true)
let source = base.appendingPathComponent("slides-svg", isDirectory: true)
let destination = base.appendingPathComponent("slides-png", isDirectory: true)
try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)

for index in 1...10 {
    let name = String(format: "slide%02d", index)
    let input = source.appendingPathComponent("\(name).svg")
    let output = destination.appendingPathComponent("\(name).png")
    guard let image = NSImage(contentsOf: input) else { fatalError("Cannot read \(input.path)") }
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1920, pixelsHigh: 1080, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    bitmap.size = NSSize(width: 1920, height: 1080)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: 1920, height: 1080).fill()
    image.draw(in: NSRect(x: 0, y: 0, width: 1920, height: 1080), from: .zero, operation: .copy, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: output)
}

print("Rendered 10 slides.")
