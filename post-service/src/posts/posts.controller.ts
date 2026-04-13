import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { ConfirmPostDto } from './dto/confirm-post.dto';
import { PostsService } from './posts.service';

@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('public')
  getPublic() {
    return this.postsService.listPublic();
  }

  @Get()
  getMine(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Connexion requise');
    }

    return this.postsService.listMine(userId);
  }

  @Get(':id')
  getOne(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.postsService.getOne(postId, userId, userRole);
  }

  @Post()
  create(@Body() dto: CreatePostDto, @Headers('x-user-id') userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Connexion requise');
    }

    return this.postsService.create(userId, dto);
  }

  @Post(':id/confirm')
  confirm(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Body() dto: ConfirmPostDto,
  ) {
    return this.postsService.confirmPublication(postId, dto.token);
  }

  @Post(':id/publish-manual')
  publishManual(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Body() dto: ConfirmPostDto,
  ) {
    return this.postsService.publishManual(postId, dto.token);
  }

  @Post(':id/cancel-manual')
  cancelManual(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Body() dto: ConfirmPostDto,
  ) {
    return this.postsService.cancelManual(postId, dto.token);
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Connexion requise');
    }

    return this.postsService.deleteMine(postId, userId);
  }

  @Post('internal/dispatch-due')
  dispatchDue(@Headers('x-cron-secret') cronSecret?: string) {
    return this.postsService.triggerDuePostConfirmations(cronSecret);
  }
}
