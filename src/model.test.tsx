import { mount } from 'enzyme'
import * as React from 'react'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { StoreProvider } from 'redux-react-hook'

import { withModel, makeModel } from './model'
import { reducer } from './model-redux'

const userModel = makeModel(
  'user',
  {
    changeName: (state, name) => {
      return { ...state, name }
    },
  },
  { name: 'initial' },
)

const setupApp = (): [any, any, any] => {
  const store = createStore(
    combineReducers({ reagent: reducer }),
    applyMiddleware(thunk),
  )

  const component1 = jest.fn(() => null)
  const Component1 = withModel(
    userModel,
    (state) => ({ user: state }),
    (actions) => ({ userActions: actions }),
  )(component1)

  const component2 = jest.fn(() => null)
  const Component2 = withModel(
    userModel,
    (state) => ({ user: state }),
    (actions) => ({ userActions: actions }),
  )(component2)

  const App = () => (
    <StoreProvider value={store}>
      <Component1 />
      <Component2 />
    </StoreProvider>
  )
  return [mount(<App />), component1, component2]
}

describe('withModel', () => {
  it('passes actions and state as defined by map* functions', () => {
    const [, cmp1, ] = setupApp()
    expect(cmp1.mock.calls[0][0].user).toEqual({ name: 'initial' })
    expect(Object.keys(cmp1.mock.calls[0][0].userActions)).toEqual(['changeName', 'setState'])
  })

  it('passes the same data to both components', () => {
    const [, cmp1, cmp2] = setupApp()
    expect(cmp1.mock.calls[0][0].user).toEqual({ name: 'initial' })
    expect(cmp2.mock.calls[0][0].user).toEqual({ name: 'initial' })
  })

  // TODO for some reason useEffect is not called here after update
  // it('update changes data in both components', () => {
  //   const [wrapper, cmp1, cmp2] = setupApp()
  //   const { changeName } = cmp1.mock.calls[0][0].userActions
  //   changeName('new')
  //   wrapper.update()
  //   expect(cmp1.mock.calls[1][0].user).toEqual({ name: 'new' })
  //   expect(cmp2.mock.calls[1][0].user).toEqual({ name: 'new' })
  // })
})
