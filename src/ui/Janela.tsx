import { useEffect, useRef, type ReactNode } from 'react'

/**
 * F22.6: janela modal com <dialog>. O resto da app fica inerte (o foco não sai da janela), Esc fecha,
 * tocar fora do conteúdo fecha, e o foco volta ao botão que a abriu.
 */
export function Janela({ rotulo, fechar, children }: { rotulo: string; fechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const janela = ref.current!
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    janela.showModal()
    return () => {
      janela.close()
      antes?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={rotulo}
      onCancel={(e) => {
        e.preventDefault()
        fechar()
      }}
      onClick={(e) => e.target === e.currentTarget && fechar()}
    >
      {children}
    </dialog>
  )
}
