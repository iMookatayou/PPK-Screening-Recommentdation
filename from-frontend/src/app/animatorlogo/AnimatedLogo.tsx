'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import styles from './AnimatedLogo.module.css'

export default function AnimatedLogo() {
  return (
    <div className={styles.logoWrapper}>
      <motion.div
        className={styles.logo3d}
        animate={{
          rotateY: 360,
          rotateX: [0, 15, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: 'linear',
        }}
      >
        <Image
          src="/images/logoppk2.png" 
          alt="Hospital Logo"
          width={80}
          height={80}
          priority
        />
      </motion.div>
    </div>
  )
}
