import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_SIZE = 24

/**
 * Lets the user crop a screenshot down to the interesting region before it is
 * sent to the model. A full-desktop screenshot wastes most of the model's
 * attention on taskbars and unrelated windows, and small text in a downscaled
 * image is often unreadable, so cropping is the single biggest accuracy lever
 * on this page.
 *
 * Works in image pixel space: the displayed preview is scaled, but the crop
 * rectangle is converted back through the scale factor before being drawn, so
 * the output is always full resolution.
 */
export default function ImageCropper({ src, onApply, onCancel }) {
  const imgRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [natW, setNatW] = useState(0)
  const [natH, setNatH] = useState(0)
  const [display, setDisplay] = useState({ w: 0, h: 0 })
  const [sel, setSel] = useState(null) // { x, y, w, h } in display pixels
  const [mode, setMode] = useState('create') // 'create' | 'move' | 'resize'
  const [handle, setHandle] = useState('')
  const drag = useRef(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setNatW(img.naturalWidth)
      setNatH(img.naturalHeight)
      setLoaded(true)
    }
    img.src = src
    imgRef.current = img
  }, [src])

  // Scale the image to fit the available box, then default the selection to
  // the whole image so the first drag only has to shrink what it does not want.
  useEffect(() => {
    if (!loaded) return
    const maxW = Math.min(880, window.innerWidth - 120)
    const maxH = 560
    const scale = Math.min(maxW / natW, maxH / natH, 1)
    const w = Math.round(natW * scale)
    const h = Math.round(natH * scale)
    setDisplay({ w, h })
    setSel({ x: 0, y: 0, w, h })
  }, [loaded, natW, natH])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const clamp = useCallback(
    (rect) => {
      let { x, y, w, h } = rect
      w = Math.max(MIN_SIZE, Math.min(w, display.w))
      h = Math.max(MIN_SIZE, Math.min(h, display.h))
      x = Math.max(0, Math.min(x, display.w - w))
      y = Math.max(0, Math.min(y, display.h - h))
      return { x, y, w, h }
    },
    [display]
  )

  function pointFrom(e) {
    const box = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  function onPointerDown(e) {
    if (!sel) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pointFrom(e)

    const inside =
      p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h

    if (!inside) {
      // Clicking outside restarts a fresh rectangle at that point.
      const next = { x: p.x, y: p.y, w: 1, h: 1 }
      setSel(next)
      setMode('create')
      drag.current = { origin: p, start: next }
      return
    }

    // Corners win over the body so a handle is never ambiguous.
    const near = (v, target) => Math.abs(v - target) <= 10
    const corners = [
      ['nw', sel.x, sel.y],
      ['ne', sel.x + sel.w, sel.y],
      ['sw', sel.x, sel.y + sel.h],
      ['se', sel.x + sel.w, sel.y + sel.h]
    ]
    const hit = corners.find(([, cx, cy]) => near(p.x, cx) && near(p.y, cy))

    if (hit) {
      setMode('resize')
      setHandle(hit[0])
    } else {
      setMode('move')
    }
    drag.current = { origin: p, start: { ...sel } }
  }

  function onPointerMove(e) {
    if (!drag.current || !sel) return
    const p = pointFrom(e)
    const dx = p.x - drag.current.origin.x
    const dy = p.y - drag.current.origin.y
    const s = drag.current.start

    if (mode === 'create') {
      setSel(
        clamp({
          x: Math.min(drag.current.origin.x, p.x),
          y: Math.min(drag.current.origin.y, p.y),
          w: Math.abs(dx),
          h: Math.abs(dy)
        })
      )
      return
    }

    if (mode === 'move') {
      setSel(clamp({ ...s, x: s.x + dx, y: s.y + dy }))
      return
    }

    let { x, y, w, h } = s
    if (handle.includes('w')) {
      w = s.w - dx
      x = s.x + dx
    }
    if (handle.includes('e')) w = s.w + dx
    if (handle.includes('n')) {
      h = s.h - dy
      y = s.y + dy
    }
    if (handle.includes('s')) h = s.h + dy

    // Dragging a top/left handle past the opposite edge would invert the box.
    if (w < MIN_SIZE) {
      if (handle.includes('w')) x = s.x + s.w - MIN_SIZE
      w = MIN_SIZE
    }
    if (h < MIN_SIZE) {
      if (handle.includes('n')) y = s.y + s.h - MIN_SIZE
      h = MIN_SIZE
    }
    setSel(clamp({ x, y, w, h }))
  }

  function endDrag() {
    drag.current = null
  }

  function selectAll() {
    setSel({ x: 0, y: 0, w: display.w, h: display.h })
  }

  // Half of each edge, centred, as a starting guess for a tighter crop.
  function tighten() {
    setSel(clamp({ x: display.w * 0.1, y: display.h * 0.1, w: display.w * 0.8, h: display.h * 0.8 }))
  }

  function handleApply() {
    const img = imgRef.current
    if (!img || !sel) return
    const scaleX = natW / display.w
    const scaleY = natH / display.h
    const sx = Math.max(0, Math.round(sel.x * scaleX))
    const sy = Math.max(0, Math.round(sel.y * scaleY))
    const sw = Math.max(1, Math.min(natW - sx, Math.round(sel.w * scaleX)))
    const sh = Math.max(1, Math.min(natH - sy, Math.round(sel.h * scaleY)))

    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    canvas.toBlob((blob) => {
      if (blob) onApply(blob, { width: sw, height: sh, sx, sy })
    }, 'image/png')
  }

  return (
    <div className="vd-crop-backdrop">
      <div className="vd-crop-modal" role="dialog" aria-label="Crop screenshot">
        <div className="vd-crop-head">
          <div>
            <h2>Crop the screenshot</h2>
            <p>Drag to select the error. Everything outside the box is discarded.</p>
          </div>
          <button type="button" className="vd-crop-x" onClick={onCancel} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {!loaded ? (
          <div className="vd-crop-loading">Loading image...</div>
        ) : (
          <div
            className="vd-crop-stage"
            style={{ width: display.w, height: display.h }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <img src={src} alt="" className="vd-crop-img" draggable={false} />

            {sel && (
              <>
                <div className="vd-crop-mask" style={{ left: 0, top: 0, right: 0, bottom: 0 }} />
                <div
                  className="vd-crop-shade"
                  style={{ left: 0, top: 0, width: sel.x, height: display.h }}
                />
                <div
                  className="vd-crop-shade"
                  style={{ left: sel.x + sel.w, top: 0, right: 0, height: display.h }}
                />
                <div
                  className="vd-crop-shade"
                  style={{ left: sel.x, top: 0, width: sel.w, height: sel.y }}
                />
                <div
                  className="vd-crop-shade"
                  style={{ left: sel.x, top: sel.y + sel.h, width: sel.w, bottom: 0 }}
                />

                <div
                  className="vd-crop-box"
                  style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}
                >
                  <div className="vd-crop-grid" aria-hidden="true" />
                  {['nw', 'ne', 'sw', 'se'].map((h) => (
                    <div
                      key={h}
                      className={`vd-crop-handle vd-crop-handle--${h}`}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="vd-crop-dims">
                    {Math.round((sel.w * natW) / display.w)} &times;{' '}
                    {Math.round((sel.h * natH) / display.h)} px
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="vd-crop-foot">
          <div className="vd-crop-quick">
            <button type="button" onClick={selectAll}>
              Whole image
            </button>
            <button type="button" onClick={tighten}>
              Tighten a little
            </button>
          </div>
          <div className="vd-crop-actions">
            <button type="button" className="vd-btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="vd-btn-primary"
              onClick={handleApply}
              disabled={!sel || !loaded}
            >
              <i className="fa-solid fa-crop-simple"></i>
              Use this crop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
