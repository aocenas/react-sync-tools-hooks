// https://medium.com/@jrwebdev/react-higher-order-component-patterns-in-typescript-42278f7590fb
import { useEffect, useRef } from 'react'

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
export type Subtract<T, K> = Omit<T, keyof K>

const areEqualShallow = (
  a: { [key: string]: any },
  b: { [key: string]: any },
) => {
  const keysOfA = Object.keys(a)
  const keysOfB = Object.keys(b)
  if (keysOfA.length !== keysOfB.length) {
    return false
  }

  for (const key of keysOfA) {
    if (
      // Just in case b is created with Object.create(null)
      !Object.prototype.hasOwnProperty.call(b, key) ||
      a[key] !== b[key]
    ) {
      return false
    }
  }

  return true
}

const usePrevious = (value: any) => {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

/**
 * Returns a token that changes when the props change. Can be used in memoization
 * of hooks when you do not know which props will be used.
 * @param props
 */
export const usePropsChangedToken = (props: object) => {
  const prevProps = usePrevious(props)
  const token = useRef<boolean>(true)
  const areEqual = areEqualShallow(prevProps, props)
  const newTokenValue = areEqual ? token.current : !token.current
  useEffect(() => {
    token.current = newTokenValue
  })

  return newTokenValue
}
