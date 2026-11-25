import { useState, type FormEvent } from 'react'
import { LogInIcon, LogOutIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { LoginError, login, logout, useSession } from '@/lib/session'

// Entrar / sair. O chat funciona sem login; o login só é preciso para consultar a própria matrícula.
export function SessionMenu() {
  const session = useSession()

  if (session.status === 'loading') return null

  if (session.status === 'student') {
    return (
      <div className="flex items-center gap-1">
        <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
          {session.aluno.nome}
        </span>
        <Button variant="ghost" size="sm" onClick={() => void logout()}>
          <LogOutIcon aria-hidden />
          Sair
        </Button>
      </div>
    )
  }

  return <LoginSheet />
}

function LoginSheet() {
  const [open, setOpen] = useState(false)
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSending(true)
    try {
      await login(matricula.trim(), senha)
      setSenha('')
      setOpen(false)
    } catch (loginError) {
      setError(loginError instanceof LoginError ? loginError.message : 'Não foi possível entrar agora.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="sm" />}>
        <LogInIcon aria-hidden />
        Entrar
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Entrar</SheetTitle>
          <SheetDescription>
            Entre com sua matrícula para o assistente consultar seus dados acadêmicos. Para tirar
            dúvidas gerais, não precisa entrar.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4" noValidate>
          <label className="flex flex-col gap-1 text-sm">
            Matrícula
            <Input
              name="matricula"
              autoComplete="username"
              inputMode="numeric"
              value={matricula}
              onChange={(event) => setMatricula(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Senha
            <Input
              name="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={sending || !matricula.trim() || !senha}>
            {sending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
