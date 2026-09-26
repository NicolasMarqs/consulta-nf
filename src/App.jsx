import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import { supabase } from './supabase'

function App() {
  const [notaFiscal, setNotaFiscal] = useState('')
  const [dados, setDados] = useState([])
  const [resultado, setResultado] = useState(null)
  const [mensagem, setMensagem] = useState('Carregando base de dados...')
  const [atualizando, setAtualizando] = useState(false)




  useEffect(() => {
async function testarSupabase() {
  const { error } = await supabase
    .from('consulta_nf')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Erro Supabase:', error)
  } else {
    console.log('Supabase conectado com sucesso!')
  }
}

testarSupabase()

    async function carregarPlanilha() {
      try {
        const resposta = await fetch(
          '/Expedição VILA GUILHERME.xlsm'
        )

        const arquivo = await resposta.arrayBuffer()
        const workbook = XLSX.read(arquivo, { type: 'array' })

        const planilha = workbook.Sheets['Planilha3']

        if (!planilha) {
          throw new Error('A aba Planilha3 não foi encontrada.')
        }

        const linhas = XLSX.utils.sheet_to_json(planilha, {
          defval: '',
          raw: false,
        })

        setDados(linhas)
        setMensagem(`${linhas.length} registros carregados`)
      } catch (erro) {
        console.error(erro)
        setMensagem('Erro ao carregar a base de dados')
      }
    }

    carregarPlanilha()
  }, [])

async function atualizarBase(event) {
  const arquivo = event.target.files?.[0]

  if (!arquivo) {
    return
  }

  try {
    setAtualizando(true)
    setMensagem('Atualizando base de dados...')

    const buffer = await arquivo.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    const planilha = workbook.Sheets['Planilha3']

    if (!planilha) {
      throw new Error('A aba Planilha3 não foi encontrada.')
    }

    const linhas = XLSX.utils.sheet_to_json(planilha, {
      defval: '',
      raw: false,
    })

    console.log('PRIMEIRA LINHA:', linhas[0])
console.log('COLUNAS:', Object.keys(linhas[0] || {}))

const registros = linhas
  .filter((linha) => linha['NOTA FISCAL'])
  .map((linha) => ({
    nota_fiscal: String(linha['NOTA FISCAL'] ?? '').trim(),
    data_carregamento: String(linha['DATA'] ?? '').trim(),
    transporte: String(linha['TRANSPORTE'] ?? '').trim(),
    motorista: String(linha['MOTORISTA'] ?? '').trim(),
    chave_acesso: String(linha['CHAVE DE ACESSO'] ?? '').trim(),
    observacao: String(linha['OBSERVAÇÃO'] ?? '').trim()
  }))

setMensagem(`Enviando ${registros.length} registros para o banco...`)

const { error: erroLimpeza } = await supabase
  .from('consulta_nf')
  .delete()
  .neq('id', 0)

if (erroLimpeza) {
  throw erroLimpeza
}

const tamanhoLote = 500

for (let i = 0; i < registros.length; i += tamanhoLote) {
  const lote = registros.slice(i, i + tamanhoLote)

  const { error } = await supabase
    .from('consulta_nf')
    .insert(lote)

  if (error) {
    throw error
  }

  setMensagem(
    `Enviando ${Math.min(i + tamanhoLote, registros.length)} de ${registros.length} registros...`
  )
}

setDados(linhas)
setResultado(null)
setNotaFiscal('')
setMensagem(`${registros.length} registros gravados no banco`)

alert('Base online atualizada com sucesso!')


  } catch (erro) {
    console.error(erro)
    setMensagem('Erro ao atualizar a base de dados')
    alert('Não foi possível atualizar a base.')
  } finally {
    setAtualizando(false)
    event.target.value = ''
  }
} 

async function consultarNF(e) {
  e.preventDefault()

  const nfDigitada = notaFiscal.trim()

  if (!nfDigitada) {
    setResultado(null)
    return
  }

  const { data, error } = await supabase
    .from('consulta_nf')
    .select('*')
    .eq('nota_fiscal', nfDigitada)
    .maybeSingle()

  if (error) {
    console.error('Erro ao consultar nota:', error)
    setResultado('erro')
    return
  }

  if (!data) {
    setResultado('nao-encontrada')
    return
  }

  setResultado({
    'NOTA FISCAL': data.nota_fiscal,
    'DATA CARREGAMENTO': data.data_carregamento,
    'TRANSPORTE': data.transporte,
    'MOTORISTA': data.motorista,
    'CHAVE DE ACESSO': data.chave_acesso,
    'OBSERVAÇÃO': data.observacao
  })
}

  return (
    <main className="pagina">
      <div className="container">
        <header className="cabecalho">
          <div className="logo">R</div>

          <div>
            <h1>Consulta de Carregamento</h1>
            <p>Expedição Vila Guilherme</p>
          </div>
        </header>

        <section className="card">
          <div className="icone">📦</div>

          <h2>Consultar Nota Fiscal</h2>

          <p className="descricao">
            Digite o número da nota fiscal para consultar
            as informações de carregamento.
          </p>

          <form onSubmit={consultarNF}>
            <label htmlFor="nf">Número da Nota Fiscal</label>

            <div className="consulta">
              <input
                id="nf"
                type="text"
                inputMode="numeric"
                placeholder="Ex.: 319495"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                autoComplete="off"
              />

              <button type="submit">Consultar</button>
            </div>
          </form>

          {resultado && resultado !== 'nao-encontrado' && (
            <div className="resultado">
              <h3>Nota Fiscal {resultado['NOTA FISCAL']}</h3>

              <p><strong>Data:</strong> {resultado['DATA CARREGAMENTO'] || '-'}</p>
              
              <p>
                <strong>Transporte:</strong>{' '}
                {resultado['TRANSPORTE'] || '-'}
              </p>

              <p>
                <strong>Motorista:</strong>{' '}
                {resultado['MOTORISTA'] || '-'}
              </p>

              <p>
                <strong>Chave de acesso:</strong>{' '}
                {resultado['CHAVE DE ACESSO'] || '-'}
              </p>

              <p>
                <strong>Observação:</strong>{' '}
                {resultado['OBSERVAÇÃO'] || '-'}
              </p>
            </div>
          )}

          {resultado === 'nao-encontrado' && (
            <div className="nao-encontrada">
              Nota fiscal não encontrada na base de dados.
            </div>
          )}
        </section>

        <div className="atualizacao">
          <span className="status"></span>
          {mensagem}
        </div>

        <div className="area-atualizar">
  <label className="botao-atualizar">
    {atualizando ? 'Atualizando...' : 'Atualizar Base'}

    <input
      type="file"
      accept=".xls,.xlsx,.xlsm"
      onChange={atualizarBase}
      disabled={atualizando}
      hidden
    />
  </label>
</div>


      </div>
    </main>
  )
}

export default App