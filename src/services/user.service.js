import { UserModel } from "*/models/user.model";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pick } from "lodash";
import { SendInBlueProvider } from "*/providers/SendInBlueProvider";
import { WEBSITE_DOMAIN } from "../utilities/constants";
import { pickUser } from "*/utilities/transform";
import { JwtProvider } from "../providers/JwtProvider";
import { env } from '*/config/environtment'
const createNew = async (data) => {
  try {
    const existUser = await UserModel.findOneByEmail(data.email);
    if (existUser) {
      throw new Error("Email already exist.");
    }

    //Tạo data user để lưu vào DB
    const nameFromEmail = data.email.split("@")[0] || "";
    const userData = {
      email: data.email,
      password: bcryptjs.hashSync(data.password, 8),
      username: nameFromEmail,
      displayName: nameFromEmail,
      verifyToken: uuidv4(),
    };
    // transaction mongodb
    const createdUser = await UserModel.createNew(userData);
    const getUser = await UserModel.findOneById(
      createdUser.insertedId.toString()
    );

    // gửi email cho người dùng click xác thực
    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${getUser.email}&token=${getUser.verifyToken}`;
    const subject =
      "Trello Clone App: Please verify your email before using our services!";
    const htmlContent = `
     <h3>Here is your verification link:</h3>
     <h3>${verificationLink}</h3>
     <h3>Sincerely,<br/> - Trungquandev Official - </h3>
    `;
    await SendInBlueProvider.sendEmail(getUser.email, subject, htmlContent);

    return pickUser(getUser);
  } catch (error) {
    throw new Error(error);
  }
};

const verifyAccount = async (data) => {
  try {
    const existUser = await UserModel.findOneByEmail(data.email);
    if (!existUser) {
      throw new Error("Email khong ton tai!");
    }

    if (existUser.isActive) {
      throw new Error("Your account is already active!");
    }

    if (data.token !== existUser.verifyToken) {
      throw new Error("Token is invalid!");
    }

    const updateData = {
      verifyToken: null,
      isActive: true,
    };

    const updatedUser = await UserModel.update(
      existUser._id.toString(),
      updateData
    );

    return pickUser(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
};



const signIn = async (data) => {
  try {
    const existUser = await UserModel.findOneByEmail(data.email)
    if (!existUser) {
      throw new Error('Email khong ton tai!')
    }

    if (!existUser.isActive) {
      throw new Error('Your account is not active!')
    }

    // Compare password
    if (!bcryptjs.compareSync(data.password, existUser.password)) {
      throw new Error('Your email or password is incorrect!')
    }

    const userInfoToStoreInJwtToken = {
      _id: existUser._id,
      email: existUser.email
    }

    // Xử lý tokens
    // Tạo 2 loại token, accessToken và refreshToken để trả về cho phía Front-end
    const accessToken = await JwtProvider.generateToken(
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_SECRET_LIFE,
      userInfoToStoreInJwtToken
    )

    const refreshToken = await JwtProvider.generateToken(
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_SECRET_LIFE,
      userInfoToStoreInJwtToken
    )

    return { accessToken, refreshToken, ...pickUser(existUser) }

  } catch (error) {
    throw new Error(error)
  }
}

export const UserService = {
  createNew,
  verifyAccount,
  signIn
};
