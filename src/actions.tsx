import * as React from 'react'
import axios, { CancelTokenSource, CancelToken, AxiosResponse } from 'axios'

const { useState, useEffect, useRef } = React

interface ActionState<T = any> {
  loading: boolean

  // Result of the async operation
  // TODO: at this moment this is tied to axios but could be more generic
  response?: AxiosResponse<T>

  error?: any
}

/**
 * This is a structure that is returned by useAction.
 */
type ActionObject<T = any> = ActionState<T> & {
  // Calling run will start an async operation defined by the action.
  run: (...args: any[]) => () => void
}

/**
 * Type of function that should be supplied to the useAction hook. It takes a CancelToken as first argument
 * from axios that can be used if the action is cancelable.
 */
type ActionFunc = (token: CancelToken, ...args: any[]) => Promise<any>
type AfterFunc = (response: AxiosResponse, ...args: any[]) => void

/**
 * Hook that gives you an action object, representing state of some async code (usually a network request).
 * @param actionFunc - Function with async operation
 * @param afterFunc - Function that will be called with the result of the actionFunc. Convenience for cases when you
 * want to do something with the result and do not want to alter the actionFunc (like storing result in global state)
 */
export const useAction = <T extends any = any>(actionFunc: ActionFunc, afterFunc?: AfterFunc): ActionObject<T> => {
  const [data, setData] = useState<ActionState>({
    loading: false,
  })

  const tokenRef = useRef<CancelTokenSource | null>(null)

  // Cancel anything that is running on component unmount
  useEffect(() => {
    return () => {
      if (tokenRef.current) {
        console.log('canceling in effect')
        tokenRef.current.cancel()
      }
    }
  }, [])

  return {
    run: (...args: any[]) => {
      if (tokenRef.current) {
        tokenRef.current.cancel()
      }
      setData({ loading: true })
      tokenRef.current = axios.CancelToken.source()

      actionFunc(tokenRef.current.token, ...args)
        .then((data) => {
          setData({ loading: false, response: data })
          if (afterFunc) {
            afterFunc(data, ...args)
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

/**
 * HOC with same functionality as the useAction hook.
 * @param actionFunc
 * @param afterFunc
 * @param actionName - Name of the action prop passed into wrapped component.
 */
export const withAction = (
  actionFunc: ActionFunc,
  afterFunc: AfterFunc,
  actionName = 'action',
) => (WrappedComponent: React.ComponentType) => {
  return (props: any) => {
    const action = useAction(actionFunc, (response) =>
      afterFunc(response, props),
    )
    return <WrappedComponent {...props} {...{ [actionName]: action }} />
  }
}
