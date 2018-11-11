import { useContext, useMemo } from 'react'
import { registerReducer } from './model-redux'
import { ReactReduxContext } from 'react-redux'
import {
  modelSetStateActionCreator,
  modelUpdateActionCreator,
} from './model-redux'

export const makeModel = (name, actions, defaultState) => {
  if (actions.setState) {
    throw new Error(
      'setState is provided automatically, you do not need to specify it.',
    )
  }

  const id =
    name +
    '__' +
    Math.random()
      .toString(32)
      .substr(2, 8)

  Object.keys(actions).forEach((key) => {
    registerReducer(id, key, actions[key])
  })

  return {
    id,
    actions,
    defaultState,
  }
}

export const useModel = (model, selector) => {
  selector =
    selector === null
      ? () => null
      : selector === undefined
      ? (state) => state
      : selector

  // TODO: rerenders on each state change
  // If so create context with just the store and subscribe manually
  const { store, storeState } = useContext(ReactReduxContext)
  // console.log('storeState', storeState)
  const requestedState = selector(storeState.reagent[model.id] || model.defaultState)

  const modelActions = useMemo(() => mapModelActions(model, store), [store, model])

  return [requestedState, modelActions]
}

const mapModelActions = (model, store) => {
  const actionsMapped = Object.keys(model.actions).reduce((acc, key) => {
    acc[key] = (...args) => {
      store.dispatch(modelUpdateActionCreator(model.id, key, ...args))
    }
    return acc
  }, {})

  actionsMapped.setState = (funcOrObj) => {
    modelSetStateActionCreator(model.id, funcOrObj)
  }
  return actionsMapped
}
