import React,{useCallback,useEffect,useState} from 'react'
import {supabase} from './supabase.js'

const errorText=e=>e?.message||'Passkey operation failed.'

export default function PasskeySecurity(){
 const [passkeys,setPasskeys]=useState([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')

 const load=useCallback(async()=>{
  setLoading(true)
  const {data,error}=await supabase.auth.passkey.list()
  if(error)throw error
  setPasskeys(Array.isArray(data)?data:[])
  setLoading(false)
 },[])

 useEffect(()=>{
  let alive=true
  supabase.auth.passkey.list().then(({data,error})=>{
   if(!alive)return
   if(error)setError(errorText(error))
   else setPasskeys(Array.isArray(data)?data:[])
   setLoading(false)
  }).catch(e=>{if(alive){setError(errorText(e));setLoading(false)}})
  return()=>{alive=false}
 },[])

 const register=async()=>{
  setBusy('register');setError('');setNotice('')
  try{
   if(!window.isSecureContext||!window.PublicKeyCredential)throw new Error('Passkeys require a supported browser and a secure HTTPS connection.')
   const {data,error}=await supabase.auth.registerPasskey()
   if(error)throw error
   await load()
   setNotice('Passkey registered successfully. Your device can now use its secure biometric or screen-lock verification.')
  }catch(e){setError(errorText(e))}
  finally{setBusy('')}
 }
 const rename=async key=>{
  const current=key.friendly_name||'My device'
  const friendlyName=window.prompt('Name this passkey/device:',current)
  if(friendlyName===null)return
  if(!friendlyName.trim())return setError('Device name cannot be empty.')
  setBusy(key.id);setError('');setNotice('')
  try{
   const {error}=await supabase.auth.passkey.update({passkeyId:key.id,friendlyName:friendlyName.trim().slice(0,120)})
   if(error)throw error
   await load();setNotice('Passkey name updated.')
  }catch(e){setError(errorText(e))}
  finally{setBusy('')}
 }
 const remove=async key=>{
  if(!window.confirm('Remove this passkey? You will no longer be able to sign in with this credential.'))return
  setBusy(key.id);setError('');setNotice('')
  try{
   const {error}=await supabase.auth.passkey.delete({passkeyId:key.id})
   if(error)throw error
   await load();setNotice('Passkey removed. Password login remains available.')
  }catch(e){setError(errorText(e))}
  finally{setBusy('')}
 }

 return <section className="social-panel passkey-panel">
  <div className="social-panel-head">
   <div><span className="social-kicker">ACCOUNT SECURITY</span><h2>Fingerprint / Passkey Login</h2><small>Use your device's real biometric prompt for secure sign-in.</small></div>
   <span className={'passkey-status '+(passkeys.length?'enabled':'')}>{passkeys.length?'Enabled':'Not enabled'}</span>
  </div>
  <p className="passkey-explain">When you register, Android or your browser opens its genuine system authentication prompt. Depending on your device, it may use fingerprint, face recognition, or your screen lock. This website never receives or stores your fingerprint or face data.</p>
  {error&&<div className="social-error" role="alert">{error}</div>}
  {notice&&<div className="social-notice" role="status">{notice}</div>}
  <button className="social-primary passkey-add" onClick={register} disabled={!!busy||loading}>
   {busy==='register'?'Waiting for device verification…':passkeys.length?'＋ Register another passkey':'🔐 Enable Fingerprint / Passkey'}
  </button>
  <div className="passkey-list-head"><b>Registered devices</b><small>{loading?'Loading…':passkeys.length+' credential(s)'}</small></div>
  {loading?<p className="social-empty">Loading registered passkeys…</p>:passkeys.length?passkeys.map(key=><article className="passkey-item" key={key.id}>
   <div className="passkey-device-icon">🔑</div>
   <div className="passkey-device-info"><b>{key.friendly_name||'Passkey device'}</b><small>Added {key.created_at?new Date(key.created_at).toLocaleDateString():'date unavailable'}{key.last_used_at?' · Last used '+new Date(key.last_used_at).toLocaleDateString():''}</small></div>
   <div className="passkey-actions"><button className="social-muted-btn" onClick={()=>rename(key)} disabled={!!busy}>Rename</button><button className="social-muted-btn danger" onClick={()=>remove(key)} disabled={!!busy}>{busy===key.id?'Please wait…':'Remove'}</button></div>
  </article>):<p className="social-empty">No passkey registered yet. Enable it on this device to use secure biometric sign-in.</p>}
  <small className="passkey-footnote">Keep your password available as a recovery option. Passkey availability depends on your browser, device, and Supabase project settings.</small>
 </section>
}
