// https://medium.com/@jrwebdev/react-higher-order-component-patterns-in-typescript-42278f7590fb
import { useEffect, useRef, ComponentType } from 'react'

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
export type Subtract<T, K> = Omit<T, keyof K>
export type GetProps<C> = C extends ComponentType<infer P> ? P : never
export type Matching<InjectedProps, DecorationTargetProps> = {
  [P in keyof DecorationTargetProps]: P extends keyof InjectedProps
    ? InjectedProps[P] extends DecorationTargetProps[P]
      ? DecorationTargetProps[P]
      : InjectedProps[P]
    : DecorationTargetProps[P]
}

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
  const areEqual = prevProps ? areEqualShallow(prevProps, props) : false
  const newTokenValue = areEqual ? token.current : !token.current
  useEffect(() => {
    token.current = newTokenValue
  })

  return newTokenValue
}

// const f = <B extends keyof any, C extends object>(arg: B, fn: (props: C) => void) => <A extends Record<B, any> & C>(obj: A): Omit<A, B> => {
//   fn(obj)
//   delete obj[arg]
//   return obj
// }
// const a = f('test', (props: { another: number }) => {})
// // TS error, another: number is missing which is good
// const b = a({ test: 1 })
//
// const d = a({ test: 1, another: 1 })
// // test does not exist which is good
// const c = d.test


