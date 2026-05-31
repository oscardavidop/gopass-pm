import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    Res,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FileEntityType, Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadFileDto } from './dto/upload-file.dto';
import { UploadsService } from './uploads.service';

interface UploadedHttpFile {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}

@ApiTags('Uploads')
@Controller()
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) { }

    @Post('uploads')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload file for task/project/user entity' })
    upload(
        @UploadedFile() file: UploadedHttpFile,
        @Body() dto: UploadFileDto,
        @CurrentUser() user: { id: string; role: Role },
    ) {
        return this.uploadsService.upload({ file, entityType: dto.entityType, entityId: dto.entityId, kind: dto.kind }, user);
    }

    @Get('uploads/:entityType/:entityId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'List files by entity' })
    list(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
        @CurrentUser() user: { id: string; role: Role },
    ) {
        return this.uploadsService.listByEntity(String(entityType).toUpperCase() as FileEntityType, entityId, user);
    }

    @Delete('uploads/:fileId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete uploaded file' })
    remove(
        @Param('fileId') fileId: string,
        @CurrentUser() user: { id: string; role: Role },
    ) {
        return this.uploadsService.delete(fileId, user);
    }

    @Get('files/:id')
    @ApiOperation({ summary: 'Stream file by signed URL' })
    @ApiQuery({ name: 'sig', required: true })
    @ApiQuery({ name: 'exp', required: true })
    async streamFile(
        @Param('id') fileId: string,
        @Query('sig') sig: string,
        @Query('exp') exp: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const payload = await this.uploadsService.getFileStream(fileId, sig, exp);
        res.setHeader('Content-Type', payload.contentType);
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.setHeader('Content-Length', String(payload.contentLength));
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return new StreamableFile(payload.stream);
    }
}
