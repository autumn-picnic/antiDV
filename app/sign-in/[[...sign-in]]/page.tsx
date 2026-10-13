import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-6 p-6'>
      <SignIn fallbackRedirectUrl='/chat' />
      <p className='max-w-sm text-center text-sm leading-6 text-gray-600'>
        收不到邮箱验证码？请检查「垃圾邮件」或「广告邮件」文件夹，并确认邮箱地址填写正确。
      </p>
    </main>
  )
}
