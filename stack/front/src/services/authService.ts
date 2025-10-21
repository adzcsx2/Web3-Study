"use client";
import { supabase } from "@/lib/supabase";
import { User, USER_ROLE, USER_STATUS } from "@/types/user";

export class AuthService {
  // 注册用户
  static async signUp(
    email: string,
    password: string,
    metadata?: {
      username?: string;
      nickname?: string;
    }
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    // 如果注册成功且用户已确认，创建用户资料
    if (data.user && !data.user.email_confirmed_at) {
      await this.createUserProfile(data.user.id, {
        username: metadata?.username,
        nickname: metadata?.nickname,
        role: USER_ROLE.READER,
        status: USER_STATUS.ACTIVE,
      });
    }

    return data;
  }

  // 登录
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // 登出
  static async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  // 重置密码
  static async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // 更新密码
  static async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // 获取当前用户
  static async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // 获取用户资料
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      username: profile?.username,
      nickname: profile?.nickname,
      avatar_url: profile?.avatar_url,
      bio: profile?.bio,
      website: profile?.website,
      role: profile?.role || USER_ROLE.READER,
      status: profile?.status || USER_STATUS.ACTIVE,
      created_at: user.created_at,
      updated_at: profile?.updated_at,
      last_sign_in_at: user.last_sign_in_at,
      post_count: profile?.post_count || 0,
      comment_count: profile?.comment_count || 0,
      follower_count: profile?.follower_count || 0,
      following_count: profile?.following_count || 0,
    };
  }

  // 创建用户资料
  static async createUserProfile(
    userId: string,
    profileData: {
      username?: string;
      nickname?: string;
      role: USER_ROLE;
      status: USER_STATUS;
    }
  ) {
    const { data, error } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        username: profileData.username,
        nickname: profileData.nickname,
        role: profileData.role,
        status: profileData.status,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    return data;
  }

  // 更新用户资料
  static async updateUserProfile(
    userId: string,
    profileData: {
      username?: string;
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      website?: string;
    }
  ) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return data;
  }

  // 验证用户权限
  static async hasPermission(
    userId: string,
    requiredRole: USER_ROLE
  ): Promise<boolean> {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile) {
      return false;
    }

    const roleHierarchy = {
      [USER_ROLE.ADMIN]: 3,
      [USER_ROLE.AUTHOR]: 2,
      [USER_ROLE.READER]: 1,
    };

    return (
      roleHierarchy[profile.role as USER_ROLE] >= roleHierarchy[requiredRole]
    );
  }

  // 关注用户
  static async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const { data: existingFollow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .single();

    if (existingFollow) {
      // 取消关注
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", existingFollow.id);

      if (error) {
        throw new Error("Failed to unfollow user");
      }

      return { following: false };
    } else {
      // 关注
      const { error } = await supabase.from("follows").insert({
        follower_id: followerId,
        following_id: followingId,
      });

      if (error) {
        throw new Error("Failed to follow user");
      }

      return { following: true };
    }
  }

  // 获取用户统计信息
  static async getUserStats(userId: string) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("post_count, comment_count, follower_count, following_count")
      .eq("id", userId)
      .single();

    return (
      profile || {
        post_count: 0,
        comment_count: 0,
        follower_count: 0,
        following_count: 0,
      }
    );
  }
}
