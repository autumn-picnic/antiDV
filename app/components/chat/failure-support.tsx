import type { FixedFallback } from '../../../service'

export default function FailureSupport({ fallback }: { fallback: FixedFallback }) {
  return <>
    <p className='whitespace-pre-wrap'>{fallback.details || fallback.message}</p>
    <nav aria-label='求助资源包' className='mt-4 grid gap-2 sm:grid-cols-3'>
      <a href='/resources' className='rounded-xl border border-gray-200 bg-white px-4 py-3 underline'>求助资源</a>
      <a href='/resources#lgbtq' className='rounded-xl border border-gray-200 bg-white px-4 py-3 underline'>多元性别支持</a>
      <a href='https://rayincare.org/assistance' className='rounded-xl border border-gray-200 bg-white px-4 py-3 underline' rel='noreferrer'>影像性暴力支持</a>
    </nav>
  </>
}
