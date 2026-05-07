<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Users, LayoutGrid, CalendarDays, Menu, X, Trash2, Wand2, Plus, Bell, ArrowUp, ArrowDown, LogOut, ExternalLink, Edit2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import request from '../api/request'

const router = useRouter()
const isMobileMenuOpen = ref(false)
const currentTab = ref('teams') // 默认进入分队管理

const navigation = [
  { id: 'registration', name: '报名大厅', icon: Users },
  { id: 'teams', name: '分队管理', icon: LayoutGrid },
  { id: 'schedule', name: '赛程安排', icon: CalendarDays },
  { id: 'announcement', name: '赛事公告', icon: Bell },
]

// 数据状态
const players = ref<any[]>([])
const teamGroups = ref<any[]>([])
const matches = ref<any[]>([])
const playerPool = ref<any[]>([])
const batchTargetTeamId = ref<number | string>('')

// 职位映射
const roleMap: Record<string, string> = {
  tank: '重装',
  damage: '输出',
  support: '支援'
}

const translateRoles = (rolesArray: string[]) => {
  if (!rolesArray || !Array.isArray(rolesArray)) return '未知'
  return rolesArray.map(r => roleMap[r] || r).join(', ')
}

// 统一的数据获取
onMounted(async () => {
  await fetchData()
})

const fetchData = async () => {
  await fetchRegistrations()
  await fetchTeams()
  await fetchMatches()
  await fetchAnnouncement()
}

const fetchRegistrations = async () => {
  try {
    const res: any = await request.get('/admin/registrations')
    if (res.success) {
      players.value = res.data.map((p: any) => {
        const prim = p.primaryRoles || p.primary_roles || []
        const sec = p.secondaryRoles || p.secondary_roles || []
        return {
          id: p.id,
          nickname: (p.battleTag || p.battle_tag || '').split('#')[0] || '未知玩家',
          gameId: p.battleTag || p.battle_tag,
          wechatId: p.wechatId || p.wechat_id || '未提供',
          rawRoles: Array.from(new Set([...prim, ...sec])),
          primaryRolesText: translateRoles(prim),
          secondaryRolesText: translateRoles(sec),
          selfRanks: p.selfRanks || p.self_ranks || {},
          rank: p.score || 0,
          registerTime: new Date(p.createdAt || p.created_at).toLocaleString()
        }
      })
    }
  } catch (error) {
    console.error(error)
  }
}

const clearRegistrations = async () => {
  showConfirm('确定要清空所有报名信息吗？该操作会将报名大厅中的数据全部移除，不可恢复！', async () => {
    try {
      const res: any = await request.delete('/admin/registrations/clear')
      if (res.success) {
        alert('清空成功！')
        await fetchData()
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '清空失败')
    }
  })
}

const fetchTeams = async () => {
  try {
    const res: any = await request.get('/board/teams')
    if (res.success) {
      // 按 groupId 分组
      const groupsMap = new Map<string, any[]>()
      res.data.forEach((t: any) => {
        const gId = t.group_id || t.groupId || 'ungrouped'
        if (!groupsMap.has(gId)) groupsMap.set(gId, [])
        groupsMap.get(gId)?.push({
          id: t.id,
          name: t.name,
          avgScore: t.members?.reduce((sum: number, m: any) => sum + Number(m.score || 0), 0) / (t.members?.length || 1) || 0,
          members: t.members || []
        })
      })
      
      const groupsArray: any[] = []
      groupsMap.forEach((teams, groupId) => {
        if (groupId !== 'ungrouped') {
          groupsArray.push({ groupId, teams })
        }
      })
      teamGroups.value = groupsArray
      calculateUnassignedPlayers()
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchMatches = async () => {
  try {
    const res: any = await request.get('/board/matches')
    if (res.success) {
      matches.value = res.data.map((m: any) => ({
        id: m.id,
        time: m.time || '待定',
        teamA: m.teamAName,
        teamB: m.teamBName,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        matchOrder: m.matchOrder || 0
      }))
    }
  } catch (error) {
    console.error(error)
  }
}

// ------------------------- 自定义 Confirm 弹窗逻辑 -------------------------
const customConfirm = ref({
  show: false,
  message: '',
  onConfirm: () => {}
})

const showConfirm = (message: string, onConfirm: () => void) => {
  customConfirm.value = {
    show: true,
    message,
    onConfirm
  }
}

const handleConfirmYes = () => {
  customConfirm.value.onConfirm()
  customConfirm.value.show = false
}

const handleConfirmNo = () => {
  customConfirm.value.show = false
}

// ------------------------- 公告逻辑 -------------------------

const announcement = ref({
  title: '',
  content: '',
  startTime: ''
})

const fetchAnnouncement = async () => {
  try {
    const res: any = await request.get('/announcements')
    if (res.success && res.data) {
      announcement.value = {
        title: res.data.title || '',
        content: res.data.content || '',
        startTime: res.data.start_time ? new Date(res.data.start_time).toISOString().slice(0, 16) : ''
      }
    }
  } catch (error) {
    console.error('获取公告失败', error)
  }
}

const saveAnnouncement = async () => {
  showConfirm('确定要保存并发布该公告吗？', async () => {
    try {
      const payload = {
        title: announcement.value.title,
        content: announcement.value.content,
        startTime: announcement.value.startTime ? new Date(announcement.value.startTime).toISOString() : null
      }
      const res: any = await request.post('/announcements', payload)
      if (res.success) {
        alert('公告保存成功！')
      } else {
        alert(res.message || '公告保存失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '网络错误，保存失败')
    }
  })
}

// ------------------------- 分队核心逻辑 -------------------------

const calculateUnassignedPlayers = () => {
  const assignedGameIds = new Set()
  teamGroups.value.forEach(group => {
    group.teams.forEach((team: any) => {
      team.members?.forEach((m: any) => {
        if (m.gameId) assignedGameIds.add(m.gameId)
      })
    })
  })

  playerPool.value = players.value
    .filter(p => !assignedGameIds.has(p.gameId))
    .map(p => ({
      ...p,
      selected: false
    }))
}

// 所有存在的队伍扁平化（用于下拉框选择）
const allFlatTeams = computed(() => {
  const list: any[] = []
  teamGroups.value.forEach((g, idx) => {
    g.teams.forEach((t: any) => {
      list.push({
        ...t,
        displayName: `对战组 ${idx + 1} - ${t.name}`
      })
    })
  })
  return list
})

// 为队伍生成固定的 5 个槽位：1重装 2输出 2支援
const getTeamSlots = (members: any[]) => {
  const slots = [
    { role: 'tank', label: '重装', member: null as any },
    { role: 'damage', label: '输出', member: null as any },
    { role: 'damage', label: '输出', member: null as any },
    { role: 'support', label: '支援', member: null as any },
    { role: 'support', label: '支援', member: null as any }
  ]
  
  const usedMemberIndexes = new Set()
  
  // 先把有 assignedRole 的对号入座
  members.forEach((m, idx) => {
    if (m.assignedRole) {
      const emptySlotIndex = slots.findIndex(s => s.role === m.assignedRole && !s.member)
      if (emptySlotIndex > -1) {
        slots[emptySlotIndex].member = m
        usedMemberIndexes.add(idx)
      }
    }
  })
  
  return slots
}

const createTeamGroup = async () => {
  showConfirm('确定要添加一组新的对战组吗？', async () => {
    try {
      const res: any = await request.post('/admin/teams/group')
      if (res.success) {
        await fetchTeams()
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '创建队伍组失败')
    }
  })
}

const deleteTeamGroup = async (groupId: string) => {
  showConfirm('确定要删除这组队伍吗？该操作会将队伍解散，玩家退回选手池，并删除关联赛程。', async () => {
    try {
      const res: any = await request.delete(`/admin/teams/group/${groupId}`)
      if (res.success) {
        await fetchData()
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '删除队伍组失败')
    }
  })
}

const autofillGroup = async (groupId: string) => {
  showConfirm('确定要自动填充本组队伍吗？系统将从选手池中按职责分配。', async () => {
    try {
      const res: any = await request.post(`/admin/teams/group/${groupId}/autofill`)
      if (res.success) {
        await fetchTeams()
        alert('自动填充完成')
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '自动填充失败')
    }
  })
}

const saveTeamChanges = async (team: any) => {
  try {
    await request.post('/admin/teams/edit', {
      teamId: team.id,
      members: team.members,
      name: team.name
    })
    calculateUnassignedPlayers()
  } catch (error) {
    console.error('保存队伍变更失败', error)
  }
}

const editTeamName = async (team: any) => {
  const newName = window.prompt('请输入新的队伍名称：', team.name)
  if (newName !== null) {
    const trimmed = newName.trim()
    if (trimmed && trimmed !== team.name) {
      try {
        const res: any = await request.post('/admin/teams/edit', {
          teamId: team.id,
          members: team.members,
          name: trimmed
        })
        if (res.success) {
          team.name = trimmed
          await fetchTeams()
          await fetchMatches()
          alert('修改名称成功')
        } else {
          alert(res.message || '修改名称失败')
        }
      } catch (error: any) {
        alert(error.response?.data?.message || '网络错误，修改名称失败')
      }
    }
  }
}

const removePlayerFromTeam = async (teamId: number, gameId: string) => {
  showConfirm('确定要将该选手移出队伍吗？', async () => {
    const team = allFlatTeams.value.find(t => t.id === teamId)
    if (team) {
      const idx = team.members.findIndex((m: any) => m.gameId === gameId)
      if (idx > -1) {
        team.members.splice(idx, 1)
        await saveTeamChanges(team)
      }
    }
  })
}

// 尝试将一个玩家加入一个队伍（寻找符合其职责的空位）
const tryAddPlayerToTeam = (player: any, team: any): boolean => {
  const slots = getTeamSlots(team.members)
  // 获取队伍当前还缺少的职位
  const missingRoles = slots.filter(s => !s.member).map(s => s.role)
  
  // 检查玩家能否打这些缺少的职位
  const playerCanPlay = player.rawRoles || []
  
  // 找到第一个匹配的空位职位
  const matchedRole = missingRoles.find(role => playerCanPlay.includes(role))
  
  if (matchedRole) {
    team.members.push({
      id: player.id,
      nickname: player.nickname,
      gameId: player.gameId,
      roles: player.rawRoles,
      assignedRole: matchedRole,
      score: player.rank || 0
    })
    return true
  }
  return false
}

// 单个加入
const addPlayerToTeam = async (playerGameId: string, teamId: number | string) => {
  if (!teamId) return
  const team = allFlatTeams.value.find(t => t.id === Number(teamId))
  const player = playerPool.value.find(p => p.gameId === playerGameId)
  
  if (team && player) {
    const success = tryAddPlayerToTeam(player, team)
    if (success) {
      await saveTeamChanges(team)
    } else {
      alert(`队伍 [${team.name}] 已经没有适合该玩家职责的空位了`)
    }
  }
}

// 批量加入
const batchAddPlayers = async () => {
  if (!batchTargetTeamId.value) return alert('请先在上方选择要批量加入的目标队伍')
  
  const team = allFlatTeams.value.find(t => t.id === Number(batchTargetTeamId.value))
  if (!team) return
  
  const selectedPlayers = playerPool.value.filter(p => p.selected)
  if (selectedPlayers.length === 0) return alert('请勾选至少一名未分配选手')
  
  let addedCount = 0
  let failedNames = []
  
  for (const player of selectedPlayers) {
    if (tryAddPlayerToTeam(player, team)) {
      addedCount++
    } else {
      failedNames.push(player.nickname)
    }
  }
  
  if (addedCount > 0) {
    await saveTeamChanges(team)
  }
  
  if (failedNames.length > 0) {
    alert(`成功加入 ${addedCount} 人。\n\n以下选手因位置冲突或队伍已满未能加入：\n${failedNames.join(', ')}`)
  } else {
    alert(`成功批量加入 ${addedCount} 人！`)
  }
}

// ------------------------- 赛程与比分逻辑 -------------------------

const publishSchedule = async () => {
  if (matches.value.length > 0) {
    showConfirm('当前已有赛程安排，发布新赛程前将清空现有赛程！确定要重新发布吗？', executePublish)
  } else {
    executePublish()
  }
}

const executePublish = async () => {
  try {
    const res: any = await request.post('/admin/matches/generate')
    if (res.success) {
      alert('赛程生成发布成功！')
      await fetchMatches()
    } else {
      alert(res.message)
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '发布失败')
  }
}

const clearSchedule = async () => {
  showConfirm('确定要清空当前所有赛程安排吗？这将会删除所有的对局和比分！', async () => {
    try {
      const res: any = await request.delete('/admin/matches/clear')
      if (res.success) {
        alert('赛程清空成功！')
        await fetchMatches()
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '清空失败')
    }
  })
}

const saveScheduleChanges = async () => {
  showConfirm('确定要保存当前的赛程修改吗？', async () => {
    try {
      const payload = {
        matches: matches.value.map((m, index) => ({
          id: m.id,
          status: m.status,
          matchOrder: index + 1 // 根据当前在数组中的顺序设置 order
        }))
      }
      const res: any = await request.post('/admin/matches/update', payload)
      if (res.success) {
        alert('赛程变更保存成功！')
        await fetchMatches()
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '保存失败')
    }
  })
}

const moveMatchUp = (index: number) => {
  if (index > 0) {
    const temp = matches.value[index]
    matches.value[index] = matches.value[index - 1]
    matches.value[index - 1] = temp
  }
}

const moveMatchDown = (index: number) => {
  if (index < matches.value.length - 1) {
    const temp = matches.value[index]
    matches.value[index] = matches.value[index + 1]
    matches.value[index + 1] = temp
  }
}

const showScoreModal = ref(false)
const currentMatchId = ref<number | null>(null)
const scoreInputA = ref<number>(0)
const scoreInputB = ref<number>(0)

const openScoreModal = (matchId: number) => {
  const match = matches.value.find(m => m.id === matchId)
  if (match) {
    currentMatchId.value = matchId
    scoreInputA.value = match.scoreA || 0
    scoreInputB.value = match.scoreB || 0
    showScoreModal.value = true
  }
}

const closeScoreModal = () => {
  showScoreModal.value = false
  currentMatchId.value = null
}

const saveScore = async () => {
  if (currentMatchId.value !== null) {
    showConfirm('确定要保存比分吗？', async () => {
      try {
        const res: any = await request.post('/admin/matches/score', {
          matchId: currentMatchId.value,
          scoreA: scoreInputA.value,
          scoreB: scoreInputB.value
        })
        
        if (res.success) {
          // 更新本地数据展示
          const match = matches.value.find(m => m.id === currentMatchId.value)
          if (match) {
            match.scoreA = scoreInputA.value
            match.scoreB = scoreInputB.value
          }
          closeScoreModal()
          alert('比分录入成功！')
        } else {
          alert(res.message || '比分录入失败')
        }
      } catch (error: any) {
        alert(error.response?.data?.message || '网络错误，比分录入失败')
      }
    })
  }
}
const handleLogout = () => {
  showConfirm('确定要退出登录吗？', () => {
    localStorage.removeItem('token')
    router.push('/login')
  })
}
</script>

<template>
  <div class="h-screen bg-gray-100 flex flex-col md:flex-row overflow-hidden">
    <!-- Mobile Header -->
    <div class="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center relative z-50 flex-shrink-0">
      <span class="text-lg font-bold">赛事管理后台</span>
      <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="p-2">
        <Menu v-if="!isMobileMenuOpen" class="w-6 h-6" />
        <X v-else class="w-6 h-6" />
      </button>
    </div>

    <!-- Sidebar -->
    <div
      :class="[
        'bg-gray-900 text-white w-full md:w-64 flex-shrink-0 flex-col md:flex transition-all duration-300 ease-in-out',
        isMobileMenuOpen ? 'flex absolute inset-0 z-40 pt-16' : 'hidden h-full'
      ]"
    >
      <div class="p-6 hidden md:block flex-shrink-0">
        <h1 class="text-xl font-bold">赛事管理后台</h1>
      </div>
      <nav class="mt-2 md:mt-6 px-4 space-y-2 flex-1 overflow-y-auto">
        <a
          v-for="item in navigation"
          :key="item.id"
          href="#"
          @click.prevent="currentTab = item.id; isMobileMenuOpen = false"
          :class="[
            'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
            currentTab === item.id 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          ]"
        >
          <component :is="item.icon" class="mr-3 w-5 h-5" />
          {{ item.name }}
        </a>
      </nav>
      
      <!-- C端入口与退出 -->
      <div class="px-4 py-4 border-t border-gray-800 space-y-2 flex-shrink-0">
        <router-link to="/" class="flex items-center px-4 py-3 text-sm font-medium text-gray-400 rounded-md hover:bg-gray-800 hover:text-white transition-colors">
          <ExternalLink class="mr-3 w-5 h-5" />
          返回报名大厅
        </router-link>
        <router-link to="/board" class="flex items-center px-4 py-3 text-sm font-medium text-gray-400 rounded-md hover:bg-gray-800 hover:text-white transition-colors">
          <ExternalLink class="mr-3 w-5 h-5" />
          返回赛事看板
        </router-link>
        <button @click="handleLogout" class="w-full flex items-center px-4 py-3 text-sm font-medium text-red-400 rounded-md hover:bg-gray-800 hover:text-red-300 transition-colors mt-4">
          <LogOut class="mr-3 w-5 h-5" />
          退出登录
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div :class="['flex-1 overflow-y-auto p-4 md:p-8 relative z-0', isMobileMenuOpen ? 'hidden md:block' : 'block']">
      <div class="bg-white rounded-lg shadow-sm min-h-full p-6">
        
        <!-- Registration Hall -->
        <div v-if="currentTab === 'registration'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">报名大厅</h2>
            <button @click="clearRegistrations" class="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              <Trash2 class="w-4 h-4 mr-1" /> 移除全部
            </button>
          </div>
          <div class="overflow-x-auto whitespace-nowrap">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">玩家昵称 (战网ID)</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">微信号</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">首选职责</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">补位职责</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">自填段位</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">报名时间</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="player in players" :key="player.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ player.gameId }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.wechatId }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.primaryRolesText || '无' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.secondaryRolesText || '无' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div v-if="player.selfRanks && Object.keys(player.selfRanks).length > 0">
                      <span v-if="player.selfRanks.tank" class="mr-2">坦:{{ player.selfRanks.tank }}</span>
                      <span v-if="player.selfRanks.damage" class="mr-2">输:{{ player.selfRanks.damage }}</span>
                      <span v-if="player.selfRanks.support">支:{{ player.selfRanks.support }}</span>
                    </div>
                    <span v-else>未填</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.registerTime }}</td>
                </tr>
                <tr v-if="players.length === 0">
                  <td colspan="6" class="px-6 py-10 text-center text-gray-500">暂无报名数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Teams Management -->
        <div v-if="currentTab === 'teams'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">分队管理 (5v5)</h2>
            <button @click="createTeamGroup" class="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              <Plus class="w-4 h-4 mr-1" /> 添加一组队伍
            </button>
          </div>
          
          <div v-if="teamGroups.length === 0" class="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-500 mb-8">
            当前没有正在进行的队伍，请点击右上角添加一组队伍
          </div>

          <!-- 队伍组展示 -->
          <div v-for="(group, idx) in teamGroups" :key="group.groupId" class="mb-8 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden shadow-sm">
            <div class="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 class="font-bold text-gray-700">对战组 {{ idx + 1 }}</h3>
              <div class="flex space-x-3">
                <button @click="autofillGroup(group.groupId)" class="flex items-center text-sm text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-md shadow-sm">
                  <Wand2 class="w-4 h-4 mr-1" /> 自动填充本组
                </button>
                <button @click="deleteTeamGroup(group.groupId)" class="flex items-center text-sm text-red-600 hover:text-red-800 bg-white border border-red-200 px-3 py-1.5 rounded-md shadow-sm">
                  <Trash2 class="w-4 h-4 mr-1" /> 删除该组
                </button>
              </div>
            </div>
            
            <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div v-for="team in group.teams" :key="team.id" class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div class="flex items-center justify-center mb-3 border-b pb-2">
                  <h4 class="text-lg font-semibold text-gray-800">{{ team.name }}</h4>
                  <button @click="editTeamName(team)" class="ml-2 text-gray-400 hover:text-blue-600" title="修改队伍名称">
                    <Edit2 class="w-4 h-4" />
                  </button>
                </div>
                <ul class="space-y-2">
                  <!-- 渲染5个职责槽位 -->
                  <li v-for="(slot, i) in getTeamSlots(team.members)" :key="i" class="flex justify-between items-center p-2 rounded bg-gray-50 border border-gray-100">
                    <div class="flex items-center">
                      <span class="inline-block w-12 text-xs font-bold text-gray-400 text-center mr-3">{{ slot.label }}</span>
                      <span v-if="slot.member" class="text-sm font-medium text-gray-900">{{ slot.member.nickname }}</span>
                      <span v-else class="text-sm italic text-gray-400">空缺</span>
                    </div>
                    <div v-if="slot.member" class="flex items-center space-x-2">
                      <span class="text-xs text-gray-500">{{ slot.member.gameId }}</span>
                      <button @click="removePlayerFromTeam(team.id, slot.member.gameId)" class="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors" title="移出队伍">
                        <X class="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Unassigned Player Pool -->
          <div class="mt-12">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-gray-800">未分配选手池</h3>
              <!-- 批量操作区 -->
              <div class="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <span class="text-sm text-gray-500 font-medium ml-2">批量操作：</span>
                <select v-model="batchTargetTeamId" class="border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                  <option value="" disabled>选择目标队伍</option>
                  <option v-for="team in allFlatTeams" :key="team.id" :value="team.id">
                    {{ team.displayName }}
                  </option>
                </select>
                <button @click="batchAddPlayers" :disabled="!batchTargetTeamId" class="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  批量加入
                </button>
              </div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <ul class="divide-y divide-gray-200">
                <li v-for="player in playerPool" :key="player.gameId" class="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors">
                  <div class="flex items-center space-x-4 mb-3 sm:mb-0">
                    <input type="checkbox" v-model="player.selected" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="font-medium text-gray-900">{{ player.gameId }}</span>
                    <span class="text-sm text-gray-500">WX: {{ player.wechatId }}</span>
                    <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">首选: {{ player.primaryRolesText }}</span>
                    <span v-if="player.secondaryRolesText" class="text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded border border-dashed">补: {{ player.secondaryRolesText }}</span>
                    <div v-if="player.selfRanks && Object.keys(player.selfRanks).length > 0" class="text-xs text-gray-500 space-x-1">
                      <span v-if="player.selfRanks.tank">坦:{{ player.selfRanks.tank }}</span>
                      <span v-if="player.selfRanks.damage">输:{{ player.selfRanks.damage }}</span>
                      <span v-if="player.selfRanks.support">支:{{ player.selfRanks.support }}</span>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <select v-model="player.selectedTeamId" class="border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                      <option value="" disabled>选择加入的队伍</option>
                      <option v-for="team in allFlatTeams" :key="team.id" :value="team.id">
                        {{ team.displayName }}
                      </option>
                    </select>
                    <button @click="addPlayerToTeam(player.gameId, player.selectedTeamId)" :disabled="!player.selectedTeamId" class="px-3 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 disabled:opacity-50 transition-colors">
                      单人加入
                    </button>
                  </div>
                </li>
                <li v-if="playerPool.length === 0" class="p-8 text-center text-gray-500">
                  当前没有未分配选手
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Announcement Management -->
        <div v-if="currentTab === 'announcement'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">赛事公告管理</h2>
            <button @click="saveAnnouncement" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              保存并发布公告
            </button>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">公告标题</label>
              <input type="text" v-model="announcement.title" placeholder="例如：2026春季赛开赛公告" class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">赛事开始时间</label>
              <input type="datetime-local" v-model="announcement.startTime" class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">赛制及详细说明</label>
              <textarea v-model="announcement.content" rows="8" placeholder="在这里输入赛制说明、奖励规则等详细信息..." class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"></textarea>
            </div>
          </div>
        </div>

        <!-- Schedule Management -->
        <div v-if="currentTab === 'schedule'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">赛程安排</h2>
            <div class="space-x-3">
              <button @click="saveScheduleChanges" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                保存修改
              </button>
              <button @click="publishSchedule" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                重新发布赛程
              </button>
              <button @click="clearSchedule" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                清空赛程
              </button>
            </div>
          </div>
          <div class="space-y-4">
            <div v-for="(match, index) in matches" :key="match.id" class="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center bg-white shadow-sm hover:shadow transition-shadow">
              <div class="flex items-center space-x-2 mb-2 sm:mb-0">
                <button @click="moveMatchUp(index)" :disabled="index === 0" class="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                  <ArrowUp class="w-4 h-4" />
                </button>
                <button @click="moveMatchDown(index)" :disabled="index === matches.length - 1" class="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                  <ArrowDown class="w-4 h-4" />
                </button>
              </div>
              <div class="flex items-center space-x-4 flex-1 justify-center">
                <span class="font-bold text-lg w-24 text-right">{{ match.teamA }}</span>
                <div class="flex flex-col items-center justify-center">
                  <span v-if="match.scoreA !== undefined && match.scoreB !== undefined && match.scoreA !== null && match.scoreB !== null" class="text-xl font-bold text-blue-600 px-2">
                    {{ match.scoreA }} : {{ match.scoreB }}
                  </span>
                  <span v-else class="text-gray-400 font-semibold px-2">VS</span>
                </div>
                <span class="font-bold text-lg w-24 text-left">{{ match.teamB }}</span>
              </div>
              <div class="w-full sm:w-auto flex justify-center sm:justify-end mt-4 sm:mt-0 space-x-3 items-center">
                <select v-model="match.status" class="border border-gray-300 rounded-md text-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                  <option value="pending">待定</option>
                  <option value="ongoing">进行中</option>
                  <option value="completed">已结束</option>
                </select>
                <button @click="openScoreModal(match.id)" class="text-sm text-blue-600 hover:text-blue-800 border border-blue-600 hover:bg-blue-50 px-3 py-1 rounded whitespace-nowrap">录入比分</button>
              </div>
            </div>
            <div v-if="matches.length === 0" class="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-500">
              暂无赛程安排，请先完成分队后点击上方"重新发布赛程"按钮
            </div>
          </div>
        </div>

        <!-- Score Modal -->
        <div v-if="showScoreModal" class="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" style="background-color: rgba(0, 0, 0, 0.25);">
          <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 class="text-xl font-bold text-gray-800 mb-6 text-center">录入比分</h3>
            <div class="flex justify-between items-center mb-8">
              <div class="flex-1 flex flex-col items-center">
                <div class="font-bold text-lg mb-3 truncate w-full text-center">{{ matches.find(m => m.id === currentMatchId)?.teamA }}</div>
                <input type="number" v-model="scoreInputA" min="0" class="w-20 border border-gray-300 rounded-md p-2 text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              </div>
              <div class="px-4 font-bold text-gray-400 text-2xl">:</div>
              <div class="flex-1 flex flex-col items-center">
                <div class="font-bold text-lg mb-3 truncate w-full text-center">{{ matches.find(m => m.id === currentMatchId)?.teamB }}</div>
                <input type="number" v-model="scoreInputB" min="0" class="w-20 border border-gray-300 rounded-md p-2 text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              </div>
            </div>
            <div class="flex justify-end space-x-3">
              <button @click="closeScoreModal" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors">取消</button>
              <button @click="saveScore" class="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">保存比分</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="customConfirm.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 transition-opacity" style="background-color: rgba(0, 0, 0, 0.25);">
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 transform transition-all">
        <h3 class="text-lg font-medium text-gray-900 mb-4">提示</h3>
        <p class="text-sm text-gray-500 whitespace-pre-wrap mb-6">{{ customConfirm.message }}</p>
        <div class="flex justify-end space-x-3">
          <button @click="handleConfirmNo" class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors">
            取消
          </button>
          <button @click="handleConfirmYes" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition-colors">
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
