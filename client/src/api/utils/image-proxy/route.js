import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    console.log("=== IMAGE PROXY API CALLED ===")

    const body = await request.json()
    const { imageUrl } = body

    console.log("Image URL to proxy:", imageUrl)

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    // If it's already a data URL, return it as is
    if (imageUrl.startsWith("data:")) {
      console.log("✅ Image is already a data URL")
      return NextResponse.json({
        success: true,
        base64: imageUrl,
        contentType: "image/jpeg",
        size: 0,
      })
    }

    // Fetch the image from the external URL with proper headers
    const response = await fetch(imageUrl, {
      method: "GET",
      headers: {
        "User-Agent": "VetVault-PDF-Generator/1.0",
        Accept: "image/*,*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
    })

    console.log("Fetch response status:", response.status)
    console.log("Fetch response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      console.error("Failed to fetch image:", response.status, response.statusText)
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer()
    console.log("Image buffer size:", imageBuffer.byteLength)

    if (imageBuffer.byteLength === 0) {
      console.error("Empty image buffer received")
      return NextResponse.json({ error: "Empty image received" }, { status: 400 })
    }

    // Convert to base64
    const base64 = Buffer.from(imageBuffer).toString("base64")

    // Determine content type from response headers or URL
    let contentType = response.headers.get("content-type") || "image/jpeg"

    // Fallback content type detection from URL extension
    if (!contentType.startsWith("image/")) {
      const urlLower = imageUrl.toLowerCase()
      if (urlLower.includes(".png")) contentType = "image/png"
      else if (urlLower.includes(".jpg") || urlLower.includes(".jpeg")) contentType = "image/jpeg"
      else if (urlLower.includes(".gif")) contentType = "image/gif"
      else if (urlLower.includes(".svg")) contentType = "image/svg+xml"
      else contentType = "image/jpeg" // default
    }

    console.log("Content type:", contentType)

    // Create data URL
    const dataUrl = `data:${contentType};base64,${base64}`

    console.log("✅ Image successfully converted to base64")
    console.log("Base64 length:", base64.length)

    return NextResponse.json({
      success: true,
      base64: dataUrl,
      contentType: contentType,
      size: imageBuffer.byteLength,
    })
  } catch (error) {
    console.error("❌ Image proxy error:", error)

    // Handle timeout errors specifically
    if (error.name === "TimeoutError") {
      return NextResponse.json({ error: "Image fetch timeout" }, { status: 408 })
    }

    return NextResponse.json({ error: `Image proxy failed: ${error.message}` }, { status: 500 })
  }
}

// Also export GET method for testing
export async function GET() {
  return NextResponse.json({ message: "Image proxy API is working", method: "POST required" })
}
