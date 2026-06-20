import React from 'react'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  // Add a class to the body to blur the background when modal is open
  React.useEffect(() => {
    document.body.classList.add('modal-blur')
    return () => {
      document.body.classList.remove('modal-blur')
    }
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl relative w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700" style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}>
        <button
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-[#DCC5B2] text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors cursor-pointer"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal 