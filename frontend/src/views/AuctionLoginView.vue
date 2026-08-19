<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Gavel } from 'lucide-vue-next'
import request from '../api/request'

const router = useRouter()
const captainCode = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  const code = captainCode.value.trim()
  if (!code) {
    alert('请输入拍卖码')
    return
  }

  isLoading.value = true
  try {
    const res: any = await request.post('/auction/login', { captainCode: code })
    if (res.success && res.data?.token) {
      localStorage.setItem('auctionCaptainToken', res.data.token)
      router.push('/auction')
    } else {
      alert(res.message || '拍卖登录失败')
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '拍卖登录失败')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <div class="flex flex-col items-center text-center">
        <div class="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center mb-4">
          <Gavel class="w-6 h-6" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">拍卖登陆</h1>
        <p class="mt-2 text-sm text-gray-500">请输入管理员发放的临时拍卖码</p>
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="handleLogin">
        <div>
          <label for="captainCode" class="block text-sm font-medium text-gray-700 mb-1">临时拍卖码</label>
          <input
            id="captainCode"
            v-model="captainCode"
            type="text"
            autocomplete="one-time-code"
            class="w-full border border-gray-300 rounded-md px-4 py-2 text-center tracking-widest font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例如 A1B2C3"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-md py-2.5 font-medium transition-colors"
        >
          {{ isLoading ? '登录中...' : '进入拍卖' }}
        </button>
      </form>

      <button @click="router.push('/')" class="mt-4 w-full text-sm text-gray-500 hover:text-gray-900">
        返回报名大厅
      </button>
    </div>
  </div>
</template>
