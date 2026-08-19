<script setup lang="ts">
import { ref } from 'vue'
import { Shield, Swords, Heart, CheckCircle2, Megaphone } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import request from '../api/request'
import { onMounted } from 'vue'
import SponsorFooter from '../components/SponsorFooter.vue'
import { formatBeijingDateTime } from '../utils/beijingTime'

const router = useRouter()
const battlenetId = ref('')
const wechatId = ref('')
const wechatGroup = ref('一群')
const primaryRoles = ref<string[]>([])
const secondaryRoles = ref<string[]>([])
const selfRanks = ref({
  tank: '',
  damage: '',
  support: ''
})
const isSubmitted = ref(false)
const announcement = ref<any>(null)
const isRegistrationOpen = ref(true)

const footerData = ref({
  donators: [],
  operators: [],
  adminContacts: []
})

const rankTiers = ['青铜', '白银', '黄金', '白金', '翡翠', '钻石', '大师', '宗师', '英杰']
const rankOptions = rankTiers.flatMap(tier => [5, 4, 3, 2, 1].map(div => `${tier}${div}`))

onMounted(async () => {
  try {
    const statusRes: any = await request.get('/registrations/status')
    if (statusRes.success && statusRes.data) {
      isRegistrationOpen.value = statusRes.data.isOpen
    }
  } catch (error) {
    console.error('获取报名状态失败', error)
  }

  try {
    const res: any = await request.get('/announcements')
    if (res.success && res.data) {
      announcement.value = res.data
    }
  } catch (error) {
    console.error('获取公告失败', error)
  }

  try {
    const res: any = await request.get('/footer')
    if (res.success && res.data) {
      footerData.value = res.data
    }
  } catch (error) {
    console.error('获取页脚数据失败', error)
  }
})

const roles = [
  { id: 'tank', name: '重装', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'damage', name: '输出', icon: Swords, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  { id: 'support', name: '支援', icon: Heart, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' }
]

const togglePrimaryRole = (roleId: string) => {
  const index = primaryRoles.value.indexOf(roleId)
  if (index === -1) {
    primaryRoles.value.push(roleId)
    const secIndex = secondaryRoles.value.indexOf(roleId)
    if (secIndex > -1) secondaryRoles.value.splice(secIndex, 1)
  } else {
    primaryRoles.value.splice(index, 1)
  }
}

const toggleSecondaryRole = (roleId: string) => {
  const index = secondaryRoles.value.indexOf(roleId)
  if (index === -1) {
    secondaryRoles.value.push(roleId)
    const primIndex = primaryRoles.value.indexOf(roleId)
    if (primIndex > -1) primaryRoles.value.splice(primIndex, 1)
  } else {
    secondaryRoles.value.splice(index, 1)
  }
}

const validateNickname = (name: string) => {
  // 规则：
  // 1. 2-12个字符(支持各国语言字母及生僻字，允许数字但不以数字开头)
  // 2. 一个井号
  // 3. 4-6位数字编码
  const regex = /^[\p{L}\p{M}][\p{L}\p{M}\p{N}]{1,11}#[0-9]{4,6}$/u
  return regex.test(name)
}

const confirmDialog = ref({
  show: false,
  message: ''
})

const announcementDialog = ref({
  show: false,
  countdown: 3,
  timer: null as any
})

const handleFormSubmit = () => {
  if (!battlenetId.value || !wechatId.value || primaryRoles.value.length === 0) return
  
  if (!validateNickname(battlenetId.value)) {
    alert('昵称格式不正确：\n1. 第一部分为2-12个字符(支持各国语言，可包含数字但不以数字开头)\n2. 第二部分为一个井号(#)\n3. 第三部分为4-6位数字编码')
    return
  }
  
  if (announcement.value && announcement.value.content) {
    announcementDialog.value.show = true
    announcementDialog.value.countdown = 3
    announcementDialog.value.timer = setInterval(() => {
      if (announcementDialog.value.countdown > 0) {
        announcementDialog.value.countdown--
      } else {
        clearInterval(announcementDialog.value.timer)
      }
    }, 1000)
  } else {
    confirmDialog.value = {
      show: true,
      message: '确认提交报名信息吗？'
    }
  }
}

const closeAnnouncementDialog = () => {
  announcementDialog.value.show = false
  if (announcementDialog.value.timer) {
    clearInterval(announcementDialog.value.timer)
  }
}

const confirmFromAnnouncement = () => {
  closeAnnouncementDialog()
  submitRegistration()
}

const submitRegistration = async () => {
  confirmDialog.value.show = false
  
  try {
    const res: any = await request.post('/registrations', {
      battleTag: battlenetId.value,
      wechatId: wechatId.value,
      wechatGroup: wechatGroup.value,
      primaryRoles: primaryRoles.value,
      secondaryRoles: secondaryRoles.value,
      selfRanks: selfRanks.value
    });

    if (res.success) {
      alert('报名成功！即将跳转至赛事看板...');
      router.push('/board');
    } else {
      alert(res.message || '报名失败');
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '网络错误，报名失败');
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        赛事报名
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        守望先锋社区赛事自动组队系统
      </p>

      <div v-if="announcement" class="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <Megaphone class="h-5 w-5 text-yellow-400" />
          </div>
          <div class="ml-3 w-full">
            <h3 class="text-sm font-bold text-yellow-800">{{ announcement.title }}</h3>
            <div class="mt-2 text-sm text-yellow-700 whitespace-pre-wrap">{{ announcement.content }}</div>
            <div v-if="announcement.start_time" class="mt-3 text-xs font-medium text-yellow-800 bg-yellow-100 inline-block px-2 py-1 rounded">
              赛事开始时间：{{ formatBeijingDateTime(announcement.start_time) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div v-if="!isRegistrationOpen" class="bg-white py-12 px-4 shadow sm:rounded-lg sm:px-10 text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">报名通道已关闭</h3>
        <p class="text-sm text-gray-500 mb-6">当前周期的报名通道已被管理员关闭，暂不接受新的报名请求。您可以前往赛事看板查看当前进度。</p>
        <button @click="router.push('/board')" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          前往赛事看板
        </button>
      </div>

      <div v-else class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div v-if="!isSubmitted">
          <form class="space-y-6" @submit.prevent="handleFormSubmit">
            <div>
              <label for="battlenet" class="block text-sm font-medium text-gray-700">
                战网昵称
              </label>
              <div class="mt-1">
                <input
                  id="battlenet"
                  v-model="battlenetId"
                  name="battlenet"
                  type="text"
                  placeholder="例如: 网易#1234 或 Player#567890"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label for="wechat" class="block text-sm font-medium text-gray-700">
                微信昵称
                <!-- 抖音昵称 -->
              </label>
              <div class="mt-1 flex space-x-2">
                <select v-model="wechatGroup" class="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm">
                  <option value="一群">一群</option>
                  <option value="二群">二群</option>
                </select>
                <input
                  id="wechat"
                  v-model="wechatId"
                  name="wechat"
                  type="text"
                  placeholder="请输入您的微信昵称"
                  required
                  class="appearance-none block flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
                <!-- <input
                  id="wechat"
                  v-model="wechatId"
                  name="wechat"
                  type="text"
                  placeholder="请输入您的抖音昵称"
                  required
                  class="appearance-none block flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                /> -->
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                自填段位 (可选)
              </label>
              <div class="space-y-3">
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-medium text-gray-700 w-12 text-right">重装</span>
                  <select v-model="selfRanks.tank" class="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md border">
                    <option value="">未定级</option>
                    <option v-for="rank in rankOptions" :key="rank" :value="rank">{{ rank }}</option>
                  </select>
                </div>
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-medium text-gray-700 w-12 text-right">输出</span>
                  <select v-model="selfRanks.damage" class="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md border">
                    <option value="">未定级</option>
                    <option v-for="rank in rankOptions" :key="rank" :value="rank">{{ rank }}</option>
                  </select>
                </div>
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-medium text-gray-700 w-12 text-right">支援</span>
                  <select v-model="selfRanks.support" class="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md border">
                    <option value="">未定级</option>
                    <option v-for="rank in rankOptions" :key="rank" :value="rank">{{ rank }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                首选职责 (可多选，必选其一)
              </label>
              <div class="grid grid-cols-3 gap-3">
                <div
                  v-for="role in roles"
                  :key="'primary-'+role.id"
                  @click="togglePrimaryRole(role.id)"
                  :class="[
                    'cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center transition-all',
                    primaryRoles.includes(role.id) 
                      ? `${role.bg} ${role.border} ring-2 ring-orange-500` 
                      : 'border-gray-200 hover:bg-gray-50'
                  ]"
                >
                  <component :is="role.icon" :class="['w-8 h-8 mb-2', primaryRoles.includes(role.id) ? role.color : 'text-gray-400']" />
                  <span :class="['text-sm font-medium', primaryRoles.includes(role.id) ? 'text-gray-900' : 'text-gray-500']">
                    {{ role.name }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                补位职责 (可多选，可选填)
              </label>
              <div class="grid grid-cols-3 gap-3">
                <div
                  v-for="role in roles"
                  :key="'secondary-'+role.id"
                  @click="toggleSecondaryRole(role.id)"
                  :class="[
                    'cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center transition-all',
                    secondaryRoles.includes(role.id) 
                      ? `${role.bg} ${role.border} ring-2 ring-orange-500` 
                      : 'border-gray-200 hover:bg-gray-50'
                  ]"
                >
                  <component :is="role.icon" :class="['w-8 h-8 mb-2', secondaryRoles.includes(role.id) ? role.color : 'text-gray-400']" />
                  <span :class="['text-sm font-medium', secondaryRoles.includes(role.id) ? 'text-gray-900' : 'text-gray-500']">
                    {{ role.name }}
                  </span>
                </div>
              </div>
            </div>

            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
              <div class="flex">
                <div class="ml-3">
                  <p class="text-sm text-blue-700">
                    提交报名即表示您已阅读并同意本周赛事规则。系统将根据您的历史战绩进行平衡分队。
                  </p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                :disabled="!battlenetId || !wechatId || primaryRoles.length === 0"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                确认报名
              </button>
            </div>
          </form>
        </div>
        
        <div v-else class="text-center py-8">
          <CheckCircle2 class="mx-auto h-16 w-16 text-green-500" />
          <h3 class="mt-4 text-xl font-medium text-gray-900">报名成功！</h3>
          <p class="mt-2 text-sm text-gray-500">
            您的报名信息已记录。请留意后续的赛程与队伍分配公示。
          </p>
          <button
            @click="isSubmitted = false; battlenetId = ''; wechatId = ''; primaryRoles = []; secondaryRoles = []; selfRanks = { tank: '', damage: '', support: '' }"
            class="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            返回报名页
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="confirmDialog.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 transition-opacity" style="background-color: rgba(0, 0, 0, 0.25);">
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 transform transition-all">
        <h3 class="text-lg font-medium text-gray-900 mb-4">提示</h3>
        <p class="text-sm text-gray-500 whitespace-pre-wrap mb-6">{{ confirmDialog.message }}</p>
        <div class="flex justify-end space-x-3">
          <button @click="confirmDialog.show = false" class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors">
            取消
          </button>
          <button @click="submitRegistration" class="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-md text-sm font-medium transition-colors">
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- Announcement Modal -->
    <div v-if="announcementDialog.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity">
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 transform transition-all max-h-[80vh] flex flex-col">
        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Megaphone class="h-5 w-5 text-yellow-500 mr-2" />
          赛事公告
        </h3>
        <div class="text-sm text-gray-700 whitespace-pre-wrap flex-1 overflow-y-auto bg-gray-50 p-4 rounded border border-gray-200 mb-6">
          <div class="font-bold mb-2">{{ announcement.title }}</div>
          <div>{{ announcement.content }}</div>
          <div v-if="announcement.start_time" class="mt-4 text-xs font-medium text-yellow-800 bg-yellow-100 inline-block px-2 py-1 rounded">
            赛事开始时间：{{ formatBeijingDateTime(announcement.start_time) }}
          </div>
        </div>
        <div class="flex justify-end space-x-3 mt-auto pt-4 border-t border-gray-100">
          <button @click="closeAnnouncementDialog" class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors">
            取消
          </button>
          <button 
            @click="confirmFromAnnouncement" 
            :disabled="announcementDialog.countdown > 0"
            :class="announcementDialog.countdown > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'"
            class="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors min-w-[100px]"
          >
            {{ announcementDialog.countdown > 0 ? `请阅读 (${announcementDialog.countdown}s)` : '确认报名' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <SponsorFooter 
      :donators="footerData.donators" 
      :operators="footerData.operators" 
      :adminContacts="footerData.adminContacts" 
    />
  </div>
</template>
