import type { ChatApiError } from '../../../service'

type Fallback = ChatApiError['fallback']

function FallbackResources() {
  return <div className='mt-2 flex flex-wrap gap-3'>
    <a href='/resources' className='underline'>查看求助资源</a>
    <a href='/resources#lgbtq' className='underline'>多元性别支持</a>
    <a href='https://rayincare.org/assistance' className='underline' rel='noreferrer'>影像性暴力支持</a>
  </div>
}

export default function FailureSupport({ fallback, message, query }: { fallback?: Fallback, message: string, query?: string }) {
  const neutral = fallback?.variant === 'neutral'
  return <>
    <p className='whitespace-pre-wrap'>{fallback?.message || message}</p>
    {fallback && (neutral
      ? <details className='mt-2'>
        <summary className='cursor-pointer'>查看可用选项</summary>
        <p className='mt-2 whitespace-pre-wrap'>{fallback.details}</p>
        <FallbackResources />
      </details>
      : <FallbackResources />)}
    {query && (neutral
      ? <details className='mt-2'><summary className='cursor-pointer'>查看未完成的消息</summary><p className='whitespace-pre-wrap'>{query}</p></details>
      : <p className='mt-2 whitespace-pre-wrap'>未完成的消息：{query}</p>)}
  </>
}
