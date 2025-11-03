import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

// Session expiration (30 days)
const SESSION_EXPIRES_DAYS = 30
