// 'use client'

// import { createContext, useContext, useState } from 'react'

// type PrintData = {
//   titleNameTh?: string
//   firstNameTh?: string
//   lastNameTh?: string
//   birthDate?: string
//   gender?: string
//   cid?: string
//   diagnosis?: string         
//   destination?: string      
// }

// const PrintContext = createContext<{
//   printData: PrintData
//   setPrintData: (data: PrintData) => void
// }>({
//   printData: {},
//   setPrintData: () => {},
// })

// export const PrintProvider = ({ children }: { children: React.ReactNode }) => {
//   const [printData, setPrintData] = useState<PrintData>({})

//   return (
//     <PrintContext.Provider value={{ printData, setPrintData }}>
//       {children}
//     </PrintContext.Provider>
//   )
// }

// export const usePrint = () => useContext(PrintContext)
