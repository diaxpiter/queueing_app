import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Celular + iPad lado a lado. Os dois são iframes da mesma origem, então
 * compartilham o localStorage e se atualizam sozinhos (evento `storage`).
 */
const PHONE = { w: 390, h: 844 }
const TABLET = { w: 1194, h: 834 }
const BORDER = 8 // espessura da moldura de cada aparelho
const GAP = 48
const TOTAL_W = PHONE.w + TABLET.w + 4 * BORDER + GAP
const TOTAL_H = Math.max(PHONE.h, TABLET.h) + 2 * BORDER
const MARGIN = 32 // folga em volta, em px da tela

export function Demo() {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)

  useEffect(() => {
    function fit() {
      const el = box.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      setScale(Math.min(1, (w - MARGIN) / TOTAL_W, (h - MARGIN) / TOTAL_H))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-[#1b1a17]">
      <div className="flex items-center justify-between px-5 py-3 text-xs text-dim">
        <Link to="/" className="hover:text-foreground">
          ← Início
        </Link>
        <span className="font-label uppercase tracking-[0.18em]">
          Demo · celular do cliente + iPad da porta
        </span>
        <span />
      </div>
      <div ref={box} className="relative min-h-0 flex-1">
        <div
          className="absolute left-1/2 top-1/2 flex items-center"
          style={{
            width: TOTAL_W,
            height: TOTAL_H,
            gap: GAP,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <Frame
            title="Celular do cliente"
            src="/fila?new"
            w={PHONE.w}
            h={PHONE.h}
            radius={44}
          />
          <Frame title="iPad da porta" src="/porta" w={TABLET.w} h={TABLET.h} radius={28} />
        </div>
      </div>
    </div>
  )
}

function Frame({
  title,
  src,
  w,
  h,
  radius,
}: {
  title: string
  src: string
  w: number
  h: number
  radius: number
}) {
  return (
    <div
      className="shrink-0 overflow-hidden border-8 border-[#2b2926] bg-background shadow-2xl"
      style={{ width: w + 2 * BORDER, height: h + 2 * BORDER, borderRadius: radius }}
    >
      <iframe title={title} src={src} width={w} height={h} className="block border-0" />
    </div>
  )
}
