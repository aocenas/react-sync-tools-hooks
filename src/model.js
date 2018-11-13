import React, { useMemo, useCallback } from 'react'
import { registerReducer } from './model-redux'
import { useMappedState, useDispatch } from 'redux-react-hook'
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

const nullSelector = () => null
const identity = (arg) => arg

// NOTE: selector needs to be memoized
export const useModel = (model, selector) => {
  selector =
    selector === null
      ? nullSelector
      : selector === undefined
        ? identity
        : selector

  const mapState = useCallback(
    (state) =>
      selector(
        state.reagent[model.id] === undefined
          ? model.defaultState
          : state.reagent[model.id],
      ),
    [model, selector],
  )

  const requestedState = useMappedState(mapState)
  const dispatch = useDispatch()

  const modelActions = useMemo(() => mapModelActions(model, dispatch), [
    model,
    dispatch,
  ])

  return [requestedState, modelActions]
}

const mapModelActions = (model, dispatch) => {
  const actionsMapped = Object.keys(model.actions).reduce((acc, key) => {
    acc[key] = (...args) => {
      dispatch(modelUpdateActionCreator(model.id, key, ...args))
    }
    return acc
  }, {})

  actionsMapped.setState = (funcOrObj) => {
    dispatch(modelSetStateActionCreator(model.id, funcOrObj))
  }
  return actionsMapped
}

export const withModel = (model, stateSelector, actionsSelector = identity) => (WrappedComponent) => {
  return (props) => {
    const [state, actions] = useModel(model, stateSelector)
    const selectedActions = actionsSelector(actions)
    return <WrappedComponent {...props} {...state} {...selectedActions}/>
  }
}
