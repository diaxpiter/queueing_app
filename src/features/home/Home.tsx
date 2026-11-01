import { LayoutPanelLeft, Smartphone, Tablet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const LINKS = [
  {
    to: '/demo',
    icon: LayoutPanelLeft,
    title: 'Demo lado a lado',
    body: 'Celular do cliente e iPad da porta na mesma tela, sincronizados. É o que mostramos a um cliente.',
  },
  {
    to: '/fila?new',
    icon: Smartphone,
    title: 'Celular do cliente',
    body: 'Entrar na fila, ver a posição, receber os avisos e montar o pedido.',
  },
  {
    to: '/porta',
    icon: Tablet,
    title: 'iPad da porta',
    body: 'A equipe vê a fila e o salão, avisa, senta e dá baixa.',
  },
]

export function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-4xl leading-none">HOLY</span>
          <span className="font-label text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Sandwich Shop
          </span>
        </div>
        <h1 className="font-display text-3xl leading-tight">Fila Virtual · v0</h1>
        <p className="max-w-xl text-muted-foreground">
          Versão de teste para achar bugs e decidir funcionalidades. Os dados ficam
          neste navegador (não há servidor ainda) e o botão “Reiniciar demo” da porta
          volta ao cenário do mockup.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {LINKS.map(({ to, icon: Icon, title, body }) => (
          <Link key={to} to={to} className="group focus-visible:outline-none">
            <Card className="h-full transition-colors group-hover:border-primary group-focus-visible:border-primary">
              <CardHeader>
                <Icon className="size-6 text-primary" />
                <CardTitle className="mt-2 text-[12px] text-foreground">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
