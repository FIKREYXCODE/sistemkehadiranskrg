import AppKit
import Foundation

// Keep the supplied artwork unchanged while giving Android icon masks safe margins.
let sourcePath = "icon-smarttrack-custom-master.png"
let outputPath = "icon-smarttrack-custom-maskable-512.png"
let canvasSize = 512
let artworkSize: CGFloat = 384

guard let artwork = NSImage(contentsOfFile: sourcePath),
      let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: canvasSize,
        pixelsHigh: canvasSize,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
      ),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
  fatalError("Could not load the artwork or create the icon canvas")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: canvasSize, height: canvasSize).fill()
let inset = (CGFloat(canvasSize) - artworkSize) / 2
artwork.draw(in: NSRect(x: inset, y: inset, width: artworkSize, height: artworkSize),
             from: .zero, operation: .copy, fraction: 1)
NSGraphicsContext.restoreGraphicsState()

guard let data = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Could not encode icon as PNG")
}
try data.write(to: URL(fileURLWithPath: outputPath))
