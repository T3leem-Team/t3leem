export const dynamic = ‘force-dynamic’

export default function MaintenancePage() {
return (
<main
dir=“rtl”
style={{
minHeight: ‘100vh’,
display: ‘flex’,
alignItems: ‘center’,
justifyContent: ‘center’,
padding: ‘24px’,
background: ‘#f4f6f8’,
fontFamily: ‘Arial, sans-serif’,
}}
>
<section
style={{
width: ‘100%’,
maxWidth: ‘480px’,
padding: ‘36px 24px’,
background: ‘#ffffff’,
borderRadius: ‘20px’,
textAlign: ‘center’,
boxShadow: ‘0 8px 30px rgba(0,0,0,0.06)’,
}}
>
<div style={{ fontSize: ‘56px’, marginBottom: ‘16px’ }}>
🛠️
    <h1 style={{ fontSize: '28px', color: '#1f2937' }}>
      النظام تحت الصيانة
    </h1>
    <p
      style={{
        fontSize: '17px',
        lineHeight: 1.9,
        color: '#64748b',
      }}
    >
      نعمل حاليًا على إجراء بعض التحسينات.
      نعتذر عن الإزعاج، يرجى المحاولة مرة أخرى لاحقًا.
    </p>
    <p style={{ marginTop: '28px', color: '#94a3b8', fontSize: '13px' }}>
      T3LEEM
    </p>
  </section>
</main>

)
}
