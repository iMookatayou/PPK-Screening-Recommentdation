// lib/axios.ts
import axios from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL

if (!baseURL) {
  throw new Error('❌ NEXT_PUBLIC_API_BASE_URL not defined in .env')
}

// สำหรับ endpoint สาธารณะ เช่น login, register
export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})

// สำหรับ endpoint ที่ต้องแนบ Bearer Token
export const authAxios = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })
}
