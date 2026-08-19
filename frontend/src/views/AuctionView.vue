<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, RefreshCcw } from 'lucide-vue-next'
import request from '../api/request'
import AuctionBoard from '../components/AuctionBoard.vue'

const router = useRouter()
const auctionState = ref<any>(null)
const myTeamId = ref<number | null>(null)
const bidAmount = ref(1)
const isLoading = ref(false)
const timer = ref<number | null>(null)

const getAuctionHeaders = () => {
  const token = localStorage.getItem('auctionCaptainToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const syncBidAmount = () => {
  if (!auctionState.value?.currentPlayer) return
  const minBid = Number(auctionState.value.currentHighestBid || 0) + 1
  const myTeam = auctionState.value.teams?.find((team: any) => team.id === myTeamId.value)
  const maxBid = Number(myTeam?.budgetRemaining || 0)
  bidAmount.value = maxBid >= minBid ? Math.min(Math.max(bidAmount.value, minBid), maxBid) : minBid
}

const fetchAuctionState = async () => {
  const token = localStorage.getItem('auctionCaptainToken')
  if (!token) {
    router.push('/auction-login')
    return
  }

  try {
    const res: any = await request.get(`/auction/state?_t=${Date.now()}`, { headers: getAuctionHeaders() })
    if (res.success) {
      auctionState.value = res.data
      myTeamId.value = res.data.myTeamId
      syncBidAmount()
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem('auctionCaptainToken')
      router.push('/auction-login')
    }
  }
}

const increaseBid = () => {
  const myTeam = auctionState.value?.teams?.find((team: any) => team.id === myTeamId.value)
  const maxBid = Number(myTeam?.budgetRemaining || 0)
  if (bidAmount.value < maxBid) bidAmount.value += 1
}

const decreaseBid = () => {
  const minBid = Number(auctionState.value?.currentHighestBid || 0) + 1
  if (bidAmount.value > minBid) bidAmount.value -= 1
}

const submitBid = async () => {
  try {
    const res: any = await request.post('/auction/bid', { bidAmount: bidAmount.value }, { headers: getAuctionHeaders() })
    if (res.success) {
      auctionState.value = res.data
      myTeamId.value = res.data.myTeamId
      syncBidAmount()
    } else {
      alert(res.message || '出价失败')
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '出价失败')
    await fetchAuctionState()
  }
}

const logout = () => {
  localStorage.removeItem('auctionCaptainToken')
  router.push('/auction-login')
}

onMounted(async () => {
  isLoading.value = true
  await fetchAuctionState()
  isLoading.value = false
  timer.value = window.setInterval(fetchAuctionState, 500)
})

onBeforeUnmount(() => {
  if (timer.value) window.clearInterval(timer.value)
})
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-gray-900 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold">拍卖分队</h1>
          <p class="text-xs text-gray-400">队长竞价面板</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="fetchAuctionState" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
            <RefreshCcw class="w-4 h-4" />
            刷新
          </button>
          <button @click="logout" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-red-300 hover:bg-gray-800 hover:text-red-200">
            <LogOut class="w-4 h-4" />
            退出
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div v-if="isLoading" class="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
        正在加载拍卖信息...
      </div>

      <div v-else-if="auctionState?.session">
        <AuctionBoard
          :state="auctionState"
          viewer="captain"
          :my-team-id="myTeamId"
          :bid-amount="bidAmount"
          @increase-bid="increaseBid"
          @decrease-bid="decreaseBid"
          @submit-bid="submitBid"
        />
      </div>

      <div v-else class="bg-white border border-gray-200 rounded-lg p-10 text-center">
        <h2 class="text-xl font-bold text-gray-900">暂无进行中的拍卖</h2>
        <p class="mt-2 text-sm text-gray-500">请等待管理员抽取队长并发放拍卖码。</p>
      </div>
    </main>
  </div>
</template>
