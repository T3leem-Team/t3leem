import {
  getUsers,
} from './users-get'

import {
  createUser,
} from './users-create'

import {
  updateUser,
} from './users-update'

import {
  deleteUser,
} from './users-delete'

export const GET = getUsers
export const POST = createUser
export const PATCH = updateUser
export const DELETE = deleteUser