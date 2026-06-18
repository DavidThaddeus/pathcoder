'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PreloaderProps {
  isVisible: boolean
  onComplete: () => void
}

export default function Preloader({ isVisible, onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(0)

  const messages = [
    "Analyzing your topics...",
    "Crafting your challenge...",
    "Optimizing difficulty...",
    "Almost ready!"
  ]

  useEffect(() => {
    if (!isVisible) return

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2
        if (newProgress >= 100) {
          clearInterval(timer)
          setTimeout(onComplete, 300)
          return 100
        }
        return newProgress
      })
    }, 60) // 60ms * 50 = 3 seconds

    const messageTimer = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length)
    }, 750)

    return () => {
      clearInterval(timer)
      clearInterval(messageTimer)
    }
  }, [isVisible, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 gap-4 h-full w-full">
              {Array.from({ length: 48 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="bg-[#DCC5B2] rounded"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1, 0],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                />
              ))}
            </div>
          </div>

          <div className="text-center z-10">
            {/* PathCoder Logo Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
              className="mb-8"
            >
              <div className="text-6xl font-bold mb-2">
                <span className="text-white">Path</span>
                <span className="text-[#DCC5B2]">Coder</span>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto border-4 border-[#DCC5B2] border-t-transparent rounded-full"
              />
            </motion.div>

            {/* Progress Bar */}
            <div className="w-80 mx-auto mb-6">
              <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#DCC5B2] to-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white text-sm mt-2"
              >
                {progress}%
              </motion.div>
            </div>

            {/* Loading Messages */}
            <motion.div
              key={currentMessage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-[#DCC5B2] text-xl font-medium h-8"
            >
              {messages[currentMessage]}
            </motion.div>

            {/* Floating Code Snippets */}
            <div className="absolute inset-0 pointer-events-none">
              {['<>', '{}', '[]', '()', '&&', '||', '===', '=>'].map((symbol, i) => (
                <motion.div
                  key={symbol}
                  className="absolute text-[#DCC5B2] opacity-30 font-mono text-2xl"
                  initial={{ 
                    x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : Math.random() * 1200,
                    y: typeof window !== 'undefined' ? window.innerHeight + 50 : 800,
                    rotate: 0
                  }}
                  animate={{ 
                    y: -50,
                    rotate: 360,
                    opacity: [0.3, 0.7, 0.3]
                  }}
                  transition={{
                    duration: 4 + Math.random() * 2,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{
                    left: `${10 + (i * 12)}%`,
                  }}
                >
                  {symbol}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 