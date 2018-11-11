import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import '../enzymeSetup'

import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'

import { useAction } from './index'
import { makeModel, useModel } from './model'
import { reducer } from './model-redux'

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
const store = createStore(
  combineReducers({ reagent: reducer }),
  composeEnhancers(applyMiddleware(thunk)),
)

const getUser = (token, id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        token.throwIfRequested()
      } catch (e) {
        reject(e)
      }
      resolve({
        data: { id, name: 'user name ' + id },
      })
    }, 10)
  })
}

const UsersModel = makeModel(
  'users',
  {
    addUser: (state, user) => {
      console.log('add user')
      return {
        ...state,
        [user.id]: user,
      }
    },
  },
  {},
)

const App = () => {
  const [, actions] = useModel(UsersModel, null)
  const { run } = useAction(getUser, (response) => {
    console.log('after', response)
    actions.addUser(response.data)
  })

  const { run: run2 } = useAction(getUser, (response) => {
    console.log('after', response)
    actions.addUser(response.data)
  })

  useEffect(
    () => {
      console.log('run')
      return run(1)
    },
    [1],
  )

  useEffect(
    () => {
      console.log('run 2')
      return run2(2)
    },
    [2],
  )

  return (
    <div>
      <Header userId={1} />
    </div>
  )
}

const Header = React.memo(({ userId }) => {
  const [user] = useModel(UsersModel, (state) => state[userId])
  console.log('header', user)

  const name = user ? user.name : 'no user'
  return <div>{name}</div>
})

const domContainer = document.querySelector('#app')
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  domContainer,
)
