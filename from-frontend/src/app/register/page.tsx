// 'use client'

// import { useState, useRef, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import axios from '@/lib/axios'
// import styles from '../login/Login.module.css'
// import { User, KeyRound, Eye, EyeOff } from 'lucide-react'
// import { motion } from 'framer-motion'
// import AnimatedLogo from '@/app/animatorlogo/AnimatedLogo'

// export default function RegisterPage() {
//   const router = useRouter()
//   const [cid, setCid] = useState('')
//   const [password, setPassword] = useState('')
//   const [confirmPassword, setConfirmPassword] = useState('')
//   const [showPassword, setShowPassword] = useState(false)
//   const [error, setError] = useState('')
//   const passwordRef = useRef<HTMLInputElement>(null)

//   useEffect(() => {
//     if (cid.length === 13) passwordRef.current?.focus()
//   }, [cid])

//   const handleRegister = async () => {
//     if (!cid || !password || !confirmPassword) {
//       setError('กรุณากรอกข้อมูลให้ครบ')
//       return
//     }
//     if (password !== confirmPassword) {
//       setError('รหัสผ่านไม่ตรงกัน')
//       return
//     }
//     try {
//       await axios.post('/api/register', { cid, password })
//       router.push('/login')
//     } catch (err: any) {
//       setError(err.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ')
//     }
//   }

//   return (
//     <div className={styles.loginBackground}>
//       <div className={styles.container}>
//         <div className={styles.loginCard}>
//           <div className={styles.left}>
//             <AnimatedLogo />
//             <div className={styles.loginHeader}><h2>REGISTER</h2></div>

//             <div className={styles.inputGroup}>
//               <User className={styles.icon} size={18} />
//               <motion.input
//                 whileFocus={{ scale: 1.03, y: -2 }}
//                 transition={{ type: 'spring', stiffness: 300, damping: 15 }}
//                 type="text"
//                 placeholder="เลขบัตรประชาชน"
//                 value={cid}
//                 onChange={(e) => setCid(e.target.value)}
//                 maxLength={13}
//                 className={styles.animatedInput}
//               />
//             </div>

//             <div className={styles.inputGroup}>
//               <KeyRound className={styles.icon} size={18} />
//               <motion.input
//                 ref={passwordRef}
//                 type={showPassword ? 'text' : 'password'}
//                 placeholder="รหัสผ่าน"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 whileFocus={{ scale: 1.03, y: -2 }}
//                 transition={{ type: 'spring', stiffness: 300, damping: 15 }}
//                 className={styles.animatedInput}
//               />
//             </div>

//             <div className={styles.inputGroup}>
//               <KeyRound className={styles.icon} size={18} />
//               <motion.input
//                 type={showPassword ? 'text' : 'password'}
//                 placeholder="ยืนยันรหัสผ่าน"
//                 value={confirmPassword}
//                 onChange={(e) => setConfirmPassword(e.target.value)}
//                 whileFocus={{ scale: 1.03, y: -2 }}
//                 transition={{ type: 'spring', stiffness: 300, damping: 15 }}
//                 className={styles.animatedInput}
//               />
//               <span className={styles.togglePassword} onClick={() => setShowPassword(!showPassword)}>
//                 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
//               </span>
//             </div>

//             <button onClick={handleRegister}>สมัครสมาชิก</button>
//             {error && <p className={styles.error}>{error}</p>}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
