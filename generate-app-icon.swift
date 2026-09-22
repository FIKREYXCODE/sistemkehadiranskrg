import AppKit
import Foundation

// Rebuild the PWA icon using the school's original crest without redrawing it.
let size = 1024
let crestPath = "icon-skrg-source.jpeg"
let outputPath = "icon-smarttrack-school-master.png"

guard let crest = NSImage(contentsOfFile: crestPath),
      let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
      ),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
  fatalError("Could not load the school crest or create the icon canvas")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high

NSColor(calibratedRed: 0.025, green: 0.345, blue: 0.735, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: size, height: size).fill()

NSColor.white.setFill()
NSBezierPath(roundedRect: NSRect(x: 263, y: 365, width: 498, height: 542), xRadius: 48, yRadius: 48).fill()
crest.draw(in: NSRect(x: 317, y: 385, width: 390, height: 502),
           from: .zero, operation: .copy, fraction: 1)

func drawCentered(_ text: String, fontSize: CGFloat, y: CGFloat) {
  let font = NSFont(name: "HelveticaNeue-CondensedBlack", size: fontSize)
    ?? NSFont.boldSystemFont(ofSize: fontSize)
  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor.white,
    .kern: 1.2
  ]
  let attributed = NSAttributedString(string: text, attributes: attributes)
  let width = attributed.size().width
  attributed.draw(at: NSPoint(x: (CGFloat(size) - width) / 2, y: y))
}

drawCentered("HEM", fontSize: 126, y: 224)
drawCentered("SMARTTRACK", fontSize: 76, y: 135)

NSGraphicsContext.restoreGraphicsState()

guard let data = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Could not encode icon as PNG")
}
try data.write(to: URL(fileURLWithPath: outputPath))
