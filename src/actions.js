import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export const useAction = (actionFunc, afterFunc) => {
  const [data, setData] = useState({
    loading: false,
  })

  const tokenRef = useRef()

  // Cancel anything that is running on unmount
  useEffect(() => {
    return () => {
      if (tokenRef.current) {
        console.log('canceling in effect')
        tokenRef.current.cancel()
      }
    }
  }, [])

  return {
    run: (...args) => {
      if (tokenRef.current) {
        tokenRef.current.cancel()
      }
      setData({ loading: true })
      tokenRef.current = axios.CancelToken.source()

      actionFunc(tokenRef.current.token, ...args)
        .then((data) => {
          setData({ loading: false, response: data })
          if (afterFunc) {
            afterFunc(data, args)
          }
          tokenRef.current = null
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            // TODO configurable error handling
            console.error(err)
          }
          // If this is not canceled we should be still mounted
          setData({ loading: false, error: err })
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

export const withAction = (actionFunc, afterFunc, actionName = 'action') => (
  WrappedComponent,
) => {
  return (props) => {
    const action = useAction(actionFunc, (response) =>
      afterFunc(response, props),
    )
    return <WrappedComponent {...props} {...{ [actionName]: action }} />
  }
}
