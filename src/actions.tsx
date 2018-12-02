import * as React from 'react'
import axios, { CancelTokenSource, CancelToken, AxiosResponse } from 'axios'
import { Omit } from './utils'

const { useState, useEffect, useRef } = React

/**
 * The state of the action which is returned by the hook.
 * The state changes are:
 *
 * Initial:
 *   { isLoading: false }
 *   run() -> Loading
 *
 * Loading:
 *   { isLoading: true }
 *   finish -> Success
 *          -> Failed
 *
 * Success:
 *   { isLoading: false, response }
 *   run() -> Loading
 *
 * Failed:
 *   { isLoading: false, error }
 *   run() -> Loading
 *
 */
interface ActionState<T = any> {
  isLoading: boolean

  // Result of the async operation
  // TODO: at this moment this is tied to axios but could be more generic
  response?: AxiosResponse<T>

  // Any error thrown by the ActionFunc
  error?: any
}

/**
 * This is a structure that is returned by useAction.
 */
export type ActionObject<T = any> = ActionState<T> & {
  // Calling run will start an async operation defined by the action.
  run: (...args: any[]) => () => void
}

/**
 * Type of function that should be supplied to the useAction hook. It takes a
 * CancelToken as first argument from axios that can be used if the action is
 * cancelable.
 */
export type ActionFunc = (token: CancelToken, ...args: any[]) => Promise<any>

/**
 * Gets a response of the ActionFunc as first argument and the same set of args
 * as the ActionFunc after that.
 * TODO: Remove the tight coupling with axios
 */
export type AfterFunc = (response: AxiosResponse, ...args: any[]) => void

/**
 * Hook that gives you an action object, representing state of some async code
 * (usually a network request).
 * @param actionFunc - Function with async operation
 * @param afterFunc - Function that will be called with the result of the
 * actionFunc. Convenience for cases when you want to do something with the
 * result and do not want to alter the actionFunc (like storing result in global
 * state)
 * @param options - Options are passed to your custom error handler. You can use
 * them to create custom per action error handling logic.
 */
export const useAction = <T extends any = any>(
  actionFunc: ActionFunc,
  afterFunc?: AfterFunc,
  options?: any,
): ActionObject<T> => {
  const [data, setData] = useState<ActionState>({
    isLoading: false,
  })

  const tokenRef = useRef<CancelTokenSource | null>(null)

  // Cancel anything that is running on component unmount
  useEffect(() => {
    return () => {
      if (tokenRef.current) {
        tokenRef.current.cancel()
      }
    }
  }, [])

  return {
    run: (...args: any[]) => {
      if (tokenRef.current) {
        tokenRef.current.cancel()
      }
      setData({ isLoading: true })
      tokenRef.current = axios.CancelToken.source()

      // Just in case the function does not return promise
      Promise.resolve(actionFunc(tokenRef.current.token, ...args))
        .then((response) => {
          // TODO: in case function did not use cancelToken we can be here after
          //  the component unmount
          setData({ isLoading: false, response })
          if (afterFunc) {
            afterFunc(response, ...args)
          }
          tokenRef.current = null
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            // If this is not canceled we should be still mounted as on unmount
            // we cancel actions
            setData({ isLoading: false, error: err })

            if (config.errorHandler) {
              config.errorHandler(err, options)
            } else {
              console.error(err)
            }
          }
        })
      return () => {
        if (tokenRef.current) {
          tokenRef.current.cancel()
          setData({ isLoading: false })
        }
      }
    },
    ...data,
  }
}

interface Config {
  /**
   * Factory function creating cancel tokens. By default it is.
   * axios.CancelToken.source but you can supply you own.
   */
  createCancelToken: () => CancelTokenSource

  /**
   * By default Axios will throw in case the request is canceled and this check
   * if the thrown error is cancellation error.
   * @param error
   */
  isCancel: (error: any) => boolean

  /**
   * In case error is not a cancellation error, it will be handled by this
   * function. If not supplied it will log the error with console.error.
   * @param error - Error instance.
   * @param options - Any options that were passed with the Action.
   */
  errorHandler?: (error: any, options: object | undefined | null) => void
}

export const config = {
  createCancelToken: axios.CancelToken.source,
  isCancel: axios.isCancel,
} as Config

/**
 * Functions similar to those provided to the useAcions hook but with additional
 * props argument.
 */
export type HocActionFunc<P> = (
  token: CancelToken,
  props: P,
  ...args: any[]
) => Promise<any>
export type HocAfterFunc<P> = (
  response: AxiosResponse,
  props: P,
  ...args: any[]
) => void

/**
 * HOC with same functionality as the useAction hook.
 * @param actionName - Name of the action prop passed into wrapped component.
 * @param actionFunc
 * @param afterFunc
 * @param options
 */
export const withAction = <
  ActionName extends keyof any,
  ActionFuncProps extends object
>(
  actionName: ActionName,
  actionFunc: HocActionFunc<ActionFuncProps>,
  afterFunc?: HocAfterFunc<ActionFuncProps>,
  options?: any,
) => <
  InnerProps extends object,
  OuterProps extends Omit<InnerProps, ActionName> & ActionFuncProps
>(
  WrappedComponent: React.ComponentType<InnerProps>,
): React.ComponentType<OuterProps> => {
  return (props: OuterProps) => {
    const action = useAction(
      (cancelToken, ...args) => actionFunc(cancelToken, props, ...args),
      afterFunc
        ? (response, ...args) => afterFunc(response, props, args)
        : undefined,
      options,
    )
    return <WrappedComponent {...props} {...{ [actionName]: action }} />
  }
}
