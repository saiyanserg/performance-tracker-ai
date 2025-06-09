import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function SupabaseTest() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('entries')
          .select('*')

        if (error) {
          console.error('Supabase error:', error)
          setStatus('error')
        } else {
          console.log('Supabase data:', data)
          setStatus('success')
        }
      } catch (err: unknown) {
        console.error('Unexpected error:', err)
        setStatus('error')
      }
    })()
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      {status === 'loading' && '🔄 Checking Supabase...'}
      {status === 'success' && '✅ Supabase is working — check your console!'}
      {status === 'error'   && '❌ Could not connect to Supabase'}
    </div>
  )
}
