import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'

import { loadMyCode, useQueueState } from '@/data/hooks'
import { isActive } from '@/domain/queue'
import { JoinScreen } from '@/features/customer/JoinScreen'
import { MessagesScreen } from '@/features/customer/MessagesScreen'
import { OrderScreen } from '@/features/customer/OrderScreen'
import { TicketScreen } from '@/features/customer/TicketScreen'
import { DoorApp } from '@/features/door/DoorApp'
import { Demo } from '@/features/home/Demo'
import { Home } from '@/features/home/Home'

/** /fila: se este aparelho já tem uma vaga ativa, abre o ticket; senão mostra o formulário. */
function JoinRoute() {
  const [params] = useSearchParams()
  const s = useQueueState()
  const mine = loadMyCode()
  const g = mine ? s.groups.find((x) => x.code === mine) : undefined
  if (!params.has('new') && g && isActive(g)) return <Navigate to={`/fila/${g.code}`} replace />
  return <JoinScreen />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/fila" element={<JoinRoute />} />
        <Route path="/fila/:code" element={<TicketScreen />} />
        <Route path="/fila/:code/mensagens" element={<MessagesScreen />} />
        <Route path="/fila/:code/pedido" element={<OrderScreen />} />
        <Route path="/porta" element={<DoorApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
