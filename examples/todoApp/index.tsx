import * as React from 'react'
import { render } from 'react-dom'
import { createStore, combineReducers, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'

import { reducer, StoreProvider, storeKey } from '../../src'
import { TodoApp } from './TodoApp'

const composeEnhancers =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
const store = createStore(
  combineReducers({ [storeKey]: reducer }),
  composeEnhancers(applyMiddleware(thunk)),
)

render(
  <StoreProvider value={store}>
    <TodoApp />
  </StoreProvider>,
  document.querySelector('#app'),
)
