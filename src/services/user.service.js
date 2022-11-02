import { UserModel } from '*/models/user.model'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pick } from 'lodash'

const createNew = async (data) => {
  try {
    const existUser = await UserModel.findOneByEmail(data.email)
    if (existUser) {
      throw new Error('Email already exist.')
    }

    //Tạo data user để lưu vào DB
    const nameFromEmail = data.email.split('@')[0] || ''
    const userData = {
      email: data.email,
      password: bcryptjs.hashSync(data.password, 8),
      username: nameFromEmail,
      displayName: nameFromEmail,
      verifyToken: uuidv4()
    }
    // transaction mongodb
    const createdUser = await UserModel.createNew(userData)
    const getUser = await UserModel.findOneById(createdUser.insertedId.toString())

    // gửi email cho người dùng click xác thực
    return pick(getUser, ['email', 'username', 'displayName', 'avatar', 'role', 'isActive', 'createAt', 'updateAt'])
  } catch (error) {
    throw new Error(error)
  }
}


export const UserService = {
  createNew
}
