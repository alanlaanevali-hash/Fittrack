export default function TestPage() {
  return (
    <div style={{padding:20,background:'#0a0e1a',minHeight:'100vh',color:'#fff',fontFamily:'monospace'}}>
      <h2>Environment Check</h2>
      <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}</p>
      <p>ANON_KEY starts with: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0,20) || 'NOT SET'}</p>
    </div>
  )
}
