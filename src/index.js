import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export const useAction = (actionFunc, afterFunc) => {
  const [data, setData] = useState({
    loading: false,
  })

  const tokenRef = useRef()
  useEffect(() => {
    if (tokenRef.current) {
      tokenRef.current.cancel()
    }
  }, [])

  return {
    run: (...args) => {
      if (tokenRef.current) {
        console.log('canceling', args)
        tokenRef.current.cancel()
      }
      setData({ loading: true })
      tokenRef.current = axios.CancelToken.source()

      actionFunc(tokenRef.current.token, ...args).then((data) => {
        setData({ loading: false, response: data })
        if (afterFunc) {
          afterFunc(data, args)
        }
        tokenRef.current = null
      }).catch(err => {
        console.log('Cancel', args)
        if (!axios.isCancel(err)) {
          console.log(err)
        }
      })
      return () => {
        if (tokenRef.current) {
          tokenRef.current.cancel()
          setData({ loading: false })
        }
      }
    },
    ...data,
  }
}
