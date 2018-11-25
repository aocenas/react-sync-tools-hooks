import { mount } from 'enzyme'
import * as React from 'react'

import { withAction, config } from './actions'

const setupComponent = (
  mockActionImpl?: (token: any, ...args: any) => void,
) => {
  const Component = jest.fn(() => null)
  const mockAction = jest.fn(mockActionImpl)
  const WrappedComponent: React.ComponentType<{ id: number }> = withAction(
    'mock',
    mockAction,
    undefined,
    {
      someOption: true,
    },
  )(Component)

  // Hooks do not work with shallow rendering
  const wrapper = mount(<WrappedComponent id={1} />)
  wrapper.render()

  return { wrapper, Component, mockAction, mockProps: Component.mock.calls }
}

const setupWithResolveAndReject = () => {
  let resolveCallback: (arg?: any) => void
  let rejectCallback: (error?: Error) => void
  const promise = new Promise((resolve, reject) => {
    resolveCallback = resolve
    rejectCallback = reject
  })
  return {
    ...setupComponent(() => promise),

    // TS cannot know it is already assigned
    // @ts-ignore
    resolve: resolveCallback,
    // @ts-ignore
    reject: rejectCallback,
  }
}

// As withAction resolve the callbacks as promises it is not immediate
// we can hook into componentDidUpdate of our mock or just wait for next loop.
const wait = () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), 0)
  })
}

describe('withAction', () => {
  it('Supplies component with correct ActionProp', () => {
    const { mockProps } = setupComponent()
    expect(mockProps[0][0].id).toBe(1)
    expect(Object.keys(mockProps[0][0].mock)).toEqual(['run', 'isLoading'])
    expect(typeof mockProps[0][0].mock.run).toBe('function')
    expect(mockProps[0][0].mock.isLoading).toBe(false)
  })

  it('It calls supplied action callback after calling run()', async () => {
    const { mockAction, mockProps } = setupComponent()
    mockProps[0][0].mock.run(1)

    // This should be a cancelToken
    expect(typeof mockAction.mock.calls[0][0]).toBe('object')
    // Props
    expect(mockAction.mock.calls[0][1]).toEqual({ id: 1 })
    // Args
    expect(mockAction.mock.calls[0][2]).toBe(1)
  })

  it('Updates isLoading state after calling run()', async () => {
    const { wrapper, mockProps, resolve } = setupWithResolveAndReject()
    mockProps[0][0].mock.run(1)
    wrapper.render()

    // We run the action which is not resolved yet, we expect to have
    // rendered with isLoading == true
    expect(mockProps[1][0].mock.isLoading).toBe(true)

    resolve()
    await wait()
    wrapper.render()

    // After resolving the promise we should no longer be loading
    expect(mockProps[2][0].mock.isLoading).toBe(false)
  })

  it('Updates result of ActionProp after resolving callback ', async () => {
    const { wrapper, mockProps, resolve } = setupWithResolveAndReject()
    mockProps[0][0].mock.run(1)
    wrapper.render()

    resolve(2)
    await wait()
    wrapper.render()
    expect(mockProps[2][0].mock.response).toBe(2)
  })

  it('Updates ActionProp with error, when action callback throws, ', async () => {
    const { wrapper, mockProps, reject } = setupWithResolveAndReject()
    mockProps[0][0].mock.run(1)
    wrapper.render()

    reject(new Error('reject test'))
    await wait()
    wrapper.render()
    expect(mockProps[2][0].mock.error instanceof Error).toBe(true)
    expect(mockProps[2][0].mock.error.message).toBe('reject test')
  })

  it('Calls custom errorHandler when action callback throws', async () => {
    const { wrapper, mockProps, reject } = setupWithResolveAndReject()
    const errorHandler = jest.fn()
    config.errorHandler = errorHandler

    mockProps[0][0].mock.run(1)
    wrapper.render()

    reject(new Error('reject test'))
    await wait()

    // Error
    expect(errorHandler.mock.calls[0][0].message).toBe('reject test')
    // Options
    expect(errorHandler.mock.calls[0][1]).toEqual({ someOption: true })
  })

  it('Cancels token on unmount', async () => {
    expect.assertions(2)
    const errorHandler = jest.fn()
    config.errorHandler = errorHandler

    const { wrapper, Component } = setupComponent(async (cancelToken) => {
      await wait()
      expect(cancelToken.reason).toBeTruthy()
      cancelToken.throwIfRequested()
    })
    Component.mock.calls[0][0].mock.run(1)
    wrapper.unmount()

    await wait()
    expect(errorHandler.mock.calls.length).toBe(0)
  })
})
