import type { Lang, MessageKind } from '@/domain/types'

/** Textos das mensagens de WhatsApp (simuladas na v0). */
const templates: Record<MessageKind, Record<Lang, string>> = {
  joined: {
    PT: 'Você entrou na fila do Holy. Posição {pos}, espera de cerca de {wait} min.\n{link}',
    EN: 'You joined the Holy queue. Position {pos}, about {wait} min wait.\n{link}',
    ES: 'Entraste en la fila de Holy. Posición {pos}, espera de unos {wait} min.\n{link}',
    FR: "Vous êtes dans la file de Holy. Position {pos}, attente d'environ {wait} min.\n{link}",
  },
  soon: {
    PT: 'Faltam cerca de 10 minutos para a sua mesa. Pode ir voltando.',
    EN: 'About 10 minutes until your table. You can start heading back.',
    ES: 'Faltan unos 10 minutos para tu mesa. Ve volviendo.',
    FR: 'Votre table sera prête dans environ 10 minutes. Vous pouvez revenir.',
  },
  ready: {
    PT: 'Sua mesa está pronta. Procure a equipe na porta — guardamos por 5 minutos.',
    EN: "Your table is ready. Come to the door — we'll hold it for 5 minutes.",
    ES: 'Tu mesa está lista. Busca al equipo en la puerta — la guardamos 5 minutos.',
    FR: "Votre table est prête. Présentez-vous à l'entrée — nous la gardons 5 minutes.",
  },
}

export interface MessageParams {
  pos?: number
  wait?: number
  link?: string
}

export function buildMessage(
  kind: MessageKind,
  lang: Lang,
  p: MessageParams = {},
): string {
  return templates[kind][lang]
    .replace('{pos}', String(p.pos ?? ''))
    .replace('{wait}', String(p.wait ?? ''))
    .replace('{link}', p.link ?? '')
}
