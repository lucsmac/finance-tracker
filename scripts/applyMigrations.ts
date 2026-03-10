/**
 * Script para aplicar migrations manualmente em produção
 *
 * USO:
 * 1. Atualize SUPABASE_SERVICE_ROLE_KEY com sua service_role key
 * 2. Execute: npx tsx scripts/applyMigrations.ts
 *
 * ATENÇÃO: Use apenas em desenvolvimento/teste inicial
 * Para produção, prefira: supabase db push
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ⚠️ CONFIGURE AQUI
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://urprwefnujrdrqwkafan.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'

if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ ERRO: Configure SUPABASE_SERVICE_ROLE_KEY primeiro!')
  console.log('\nEncontre a service_role key em:')
  console.log('Supabase Dashboard > Settings > API > Project API keys > service_role (secret)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigrations() {
  console.log('🚀 Aplicando migrations...\n')

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
  const files = readdirSync(migrationsDir).sort()

  for (const file of files) {
    if (!file.endsWith('.sql')) continue

    console.log(`📄 Aplicando: ${file}`)

    try {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')

      // Supabase REST API não suporta múltiplos statements bem
      // Então vamos executar via RPC se possível, ou dividir
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).throwOnError()

      if (error) {
        console.error(`   ❌ Erro: ${error.message}`)
        console.log(`   ℹ️  Pode ser que o SQL já foi aplicado anteriormente`)
      } else {
        console.log(`   ✅ Aplicado com sucesso`)
      }
    } catch (err: any) {
      console.error(`   ❌ Erro: ${err.message}`)
      console.log(`   ℹ️  Você pode precisar executar manualmente no SQL Editor`)
    }

    console.log('')
  }

  console.log('✨ Processo concluído!')
  console.log('\n⚠️  IMPORTANTE:')
  console.log('Se houver erros, execute as migrations manualmente no Supabase Dashboard > SQL Editor')
}

applyMigrations().catch(console.error)
